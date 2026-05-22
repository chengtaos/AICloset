import logging

from sqlalchemy.orm import Session

from app.agent.llm import generate_recommendations
from app.agent.matcher import filter_candidates, match
from app.agent.weather import get_weather
from app.models import ClothingItem, Recommendation, UserProfile
from app.services.preferences import format_preferences_for_llm
from app.schemas import (
    ClothingItemBrief,
    DailyRecommendRequest,
    RecommendResponse,
    RecommendSuggestion,
    ScenarioRecommendRequest,
    WeatherInfo,
)

logger = logging.getLogger(__name__)

# 场景描述关键词 → 场合标签映射
_OCCASION_KEYWORDS: dict[str, list[str]] = {
    "通勤": ["面试", "会议", "通勤", "上班", "正式"],
    "聚会": ["约会", "聚会", "派对", "蹦迪"],
    "运动": ["运动", "跑步", "健身", "瑜伽"],
    "度假": ["旅行", "度假", "出游"],
    "居家": ["居家", "宅", "睡觉"],
}


def _item_to_brief(item: ClothingItem) -> ClothingItemBrief:
    """将 ORM 对象转为轻量 Brief schema，供推荐结果使用。"""
    return ClothingItemBrief(
        id=item.id,
        category=item.category,
        sub_category=item.sub_category,
        colors=item.colors or [],
        images=item.images or [],
        style_tags=item.style_tags or [],
    )


def _build_response(
    db: Session,
    weather: WeatherInfo,
    suggestions: list[dict],
    user_id: int,
    rec_type: str,
    context: dict,
) -> RecommendResponse:
    """构建推荐响应：将建议中的 item_ids 解析为 Brief 列表，并持久化推荐记录。"""
    result_suggestions = []
    for s in suggestions:
        item_ids = s.get("item_ids", [])
        # LLM 可能直接返回 ORM 对象（fallback 路径），需统一转为 Brief
        if item_ids and hasattr(item_ids[0], "id"):
            items = item_ids
        else:
            items = (
                db.query(ClothingItem)
                .filter(ClothingItem.id.in_(item_ids))
                .all()
            )
        briefs = [_item_to_brief(it) for it in items]
        result_suggestions.append(RecommendSuggestion(
            items=briefs,
            reason=s.get("reason", ""),
        ))

    response = RecommendResponse(weather=weather, suggestions=result_suggestions)

    # 持久化推荐记录，便于后续反馈闭环
    rec = Recommendation(
        user_id=user_id,
        type=rec_type,
        context=context,
        result={"suggestions": [s.model_dump() for s in result_suggestions]},
    )
    db.add(rec)
    db.commit()

    return response


def _resolve_occasion(description: str) -> str:
    """根据场景描述文本匹配场合标签，未匹配时返回空字符串。"""
    for occasion, keywords in _OCCASION_KEYWORDS.items():
        if any(kw in description for kw in keywords):
            return occasion
    return ""


def _run_recommend_pipeline(
    db: Session,
    weather: WeatherInfo,
    occasion: str,
    user_id: int,
) -> list[dict]:
    """执行推荐流水线：加载偏好 → 规则粗筛 → LLM 精排（注入偏好）；LLM 不可用时降级为偏好加权规则引擎。"""
    candidates = filter_candidates(db, weather, user_id)

    # 加载用户偏好档案
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    preferences_text = format_preferences_for_llm(profile)

    llm_result = generate_recommendations(candidates, weather, occasion, limit=3, preferences_text=preferences_text)

    if llm_result:
        logger.info("使用 LLM 推荐结果（偏好注入=%s）", bool(preferences_text))
        return [{"item_ids": r["item_ids"], "reason": r["reason"]} for r in llm_result]

    logger.info("LLM 不可用，降级到规则引擎（偏好加权=%s）", bool(profile and (profile.total_wear_events or 0) >= 5))
    raw = match(db, weather, user_id, occasion, limit=3, profile=profile)
    return [{"item_ids": s["items"], "reason": s["reason"]} for s in raw]


def recommend_daily(db: Session, req: DailyRecommendRequest, user_id: int) -> RecommendResponse:
    """日常推荐：根据天气和场合生成穿搭建议。"""
    weather = get_weather(req.city)
    context = {"city": req.city, "occasion": req.occasion, "weather": weather.model_dump()}
    suggestions = _run_recommend_pipeline(db, weather, req.occasion, user_id)
    return _build_response(db, weather, suggestions, user_id, "daily", context)


def recommend_scenario(db: Session, req: ScenarioRecommendRequest, user_id: int) -> RecommendResponse:
    """场景推荐：根据自然语言描述识别场合后生成穿搭建议。"""
    weather = get_weather(req.city)
    occasion = _resolve_occasion(req.description)

    context = {
        "description": req.description,
        "city": req.city,
        "occasion": occasion,
        "weather": weather.model_dump(),
    }

    suggestions = _run_recommend_pipeline(db, weather, occasion, user_id)
    return _build_response(db, weather, suggestions, user_id, "scenario", context)

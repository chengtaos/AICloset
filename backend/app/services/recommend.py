import logging
from sqlalchemy.orm import Session
from app.agent.weather import get_weather
from app.agent.matcher import filter_candidates, match
from app.agent.llm import generate_recommendations
from app.models import ClothingItem, Recommendation
from app.schemas import (
    DailyRecommendRequest,
    ScenarioRecommendRequest,
    RecommendResponse,
    ClothingItemBrief,
    RecommendSuggestion,
    WeatherInfo,
)

logger = logging.getLogger(__name__)


def _build_response(
    db: Session,
    weather: WeatherInfo,
    suggestions: list[dict],
    user_id: int,
    rec_type: str,
    context: dict,
) -> RecommendResponse:
    result_suggestions = []
    for s in suggestions:
        item_ids = s.get("item_ids", [])
        # 如果返回的是 ORM 对象（fallback），转为 brief
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

    rec = Recommendation(
        user_id=user_id,
        type=rec_type,
        context=context,
        result={"suggestions": [s.model_dump() for s in result_suggestions]},
    )
    db.add(rec)
    db.commit()

    return response


def recommend_daily(db: Session, req: DailyRecommendRequest, user_id: int = 1) -> RecommendResponse:
    weather = get_weather(req.city)
    context = {"city": req.city, "occasion": req.occasion, "weather": weather.model_dump()}

    # 1. 规则粗筛
    candidates = filter_candidates(db, weather, user_id)

    # 2. LLM 精排
    llm_result = generate_recommendations(candidates, weather, req.occasion, limit=3)

    # 3. Fallback：LLM 不可用或返回空时用规则引擎
    if llm_result:
        logger.info("使用 LLM 推荐结果")
        suggestions = [{"item_ids": r["item_ids"], "reason": r["reason"]} for r in llm_result]
    else:
        logger.info("LLM 不可用，降级到规则引擎")
        suggestions = match(db, weather, user_id, req.occasion, limit=3)
        suggestions = [{"item_ids": s["items"], "reason": s["reason"]} for s in suggestions]

    return _build_response(db, weather, suggestions, user_id, "daily", context)


def recommend_scenario(db: Session, req: ScenarioRecommendRequest, user_id: int = 1) -> RecommendResponse:
    weather = get_weather(req.city)

    desc = req.description
    if any(w in desc for w in ("面试", "会议", "通勤", "上班", "正式")):
        occasion = "通勤"
    elif any(w in desc for w in ("约会", "聚会", "派对", "蹦迪")):
        occasion = "聚会"
    elif any(w in desc for w in ("运动", "跑步", "健身", "瑜伽")):
        occasion = "运动"
    elif any(w in desc for w in ("旅行", "度假", "出游")):
        occasion = "度假"
    elif any(w in desc for w in ("居家", "宅", "睡觉")):
        occasion = "居家"
    else:
        occasion = ""

    context = {"description": desc, "city": req.city, "occasion": occasion, "weather": weather.model_dump()}

    candidates = filter_candidates(db, weather, user_id)
    llm_result = generate_recommendations(candidates, weather, occasion, limit=3)

    if llm_result:
        logger.info("使用 LLM 推荐结果")
        suggestions = [{"item_ids": r["item_ids"], "reason": r["reason"]} for r in llm_result]
    else:
        logger.info("LLM 不可用，降级到规则引擎")
        raw = match(db, weather, user_id, occasion, limit=3)
        suggestions = [{"item_ids": s["items"], "reason": s["reason"]} for s in raw]

    return _build_response(db, weather, suggestions, user_id, "scenario", context)


def _item_to_brief(item: ClothingItem):
    return ClothingItemBrief(
        id=item.id,
        category=item.category,
        sub_category=item.sub_category,
        colors=item.colors or [],
        images=item.images or [],
        style_tags=item.style_tags or [],
    )

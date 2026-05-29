import logging

from sqlalchemy.orm import Session

from app.agent.llm import generate_recommendations, generate_capsule
from app.agent.matcher import filter_candidates, match
from app.agent.weather import get_weather
from app.models import ClothingItem, Recommendation, UserProfile
from app.services.preferences import format_preferences_for_llm
from app.schemas import (
    CapsuleRequest,
    CapsuleResponse,
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
        name=item.name or "",
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

    # 先持久化推荐记录，获取自增 ID
    rec = Recommendation(
        user_id=user_id,
        type=rec_type,
        context=context,
        result={"suggestions": [s.model_dump() for s in result_suggestions]},
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    response = RecommendResponse(recommendation_id=rec.id, weather=weather, suggestions=result_suggestions)
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
    api_keys: dict[str, str] | None = None,
) -> list[dict]:
    """执行推荐流水线：加载偏好 → 规则粗筛 → LLM 精排（注入偏好）；LLM 不可用时降级为偏好加权规则引擎。"""
    keys = api_keys or {}
    candidates = filter_candidates(db, weather, user_id)

    # 加载用户偏好档案
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    preferences_text = format_preferences_for_llm(profile)

    llm_result = generate_recommendations(
        candidates, weather, occasion,
        limit=3, preferences_text=preferences_text,
        api_key=keys.get("deepseek", ""),
    )

    if llm_result:
        logger.info("使用 LLM 推荐结果（偏好注入=%s）", bool(preferences_text))
        return [{"item_ids": r["item_ids"], "reason": r["reason"]} for r in llm_result]

    logger.info("LLM 不可用，降级到规则引擎（偏好加权=%s）", bool(profile and (profile.total_wear_events or 0) >= 5))
    raw = match(db, weather, user_id, occasion, limit=3, profile=profile)
    return [{"item_ids": s["items"], "reason": s["reason"]} for s in raw]


def recommend_daily(
    db: Session, req: DailyRecommendRequest, user_id: int, api_keys: dict[str, str] | None = None,
) -> RecommendResponse:
    """日常推荐：根据天气和场合生成穿搭建议。api_keys 为用户自备 Key，未提供则用全局配置。"""
    keys = api_keys or {}
    weather = get_weather(req.city, api_key=keys.get("amap", ""))
    context = {"city": req.city, "occasion": req.occasion, "weather": weather.model_dump()}
    suggestions = _run_recommend_pipeline(db, weather, req.occasion, user_id, keys)
    return _build_response(db, weather, suggestions, user_id, "daily", context)


def recommend_scenario(
    db: Session, req: ScenarioRecommendRequest, user_id: int, api_keys: dict[str, str] | None = None,
) -> RecommendResponse:
    """场景推荐：根据自然语言描述识别场合后生成穿搭建议。api_keys 为用户自备 Key，未提供则用全局配置。"""
    keys = api_keys or {}
    weather = get_weather(req.city, api_key=keys.get("amap", ""))
    occasion = _resolve_occasion(req.description)

    context = {
        "description": req.description,
        "city": req.city,
        "occasion": occasion,
        "weather": weather.model_dump(),
    }

    suggestions = _run_recommend_pipeline(db, weather, occasion, user_id, keys)
    return _build_response(db, weather, suggestions, user_id, "scenario", context)


def _capsule_fallback(items: list[ClothingItem], days: int, occasions: str) -> CapsuleResponse:
    """规则引擎 fallback：无 LLM 时从衣橱中按品类贪心选出胶囊衣橱。"""
    from collections import defaultdict
    by_cat = defaultdict(list)
    for it in items:
        by_cat[it.category].append(it)

    picked: list[ClothingItem] = []
    # 优先黑/白/灰/卡其色基础款
    def _priority(it: ClothingItem) -> int:
        score = 0
        for c in (it.colors or []):
            if any(kw in c for kw in ["黑", "白", "灰", "卡其", "米", "藏青"]):
                score += 2
        if any(kw in (it.style_tags or []) for kw in ["百搭", "基础", "极简", "通勤", "休闲"]):
            score += 1
        return score

    # 按品类各取1-2件基础款
    for cat, pool in by_cat.items():
        pool.sort(key=_priority, reverse=True)
        if cat in ("tshirt", "blouse", "sweater"):
            picked.extend(pool[:2])
        elif cat in ("pants", "shorts", "skirt"):
            picked.extend(pool[:2])
        elif cat in ("outer",):
            picked.extend(pool[:1])
        elif cat in ("dress",):
            picked.extend(pool[:1])
        elif cat in ("shoes",):
            picked.extend(pool[:2])

    # 限制总数
    picked = picked[:12]

    # 生成每日方案
    occasion_list = [o.strip() for o in occasions.split(",") if o.strip()] if occasions else ["日常"]
    outfits = []
    for day in range(1, days + 1):
        occ = occasion_list[(day - 1) % len(occasion_list)] if occasion_list else "日常"
        day_ids = [it.id for it in picked[:4]]
        outfits.append({"day": day, "item_ids": day_ids, "occasion": occ, "reason": f"第{day}天{occ}搭配"})

    briefs = [_item_to_brief(it) for it in picked]
    return CapsuleResponse(
        items=briefs,
        outfits=outfits,
        packing_tip="优先选基础色系单品方便互搭，鞋子不超过2双。卷叠收纳省空间，厚重外套穿身上。",
    )


def recommend_capsule(
    db: Session, req: CapsuleRequest, user_id: int, api_keys: dict[str, str] | None = None,
) -> CapsuleResponse:
    """旅行胶囊衣橱：用最少件数搭配最多方案。"""
    keys = api_keys or {}
    all_items = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.status == "available",
    ).all()

    # 尝试 LLM
    llm_result = generate_capsule(
        all_items, req.destination, req.days, req.occasions,
        api_key=keys.get("deepseek", ""),
    )

    if llm_result:
        item_ids = llm_result.get("items", [])
        valid_items = [it for it in all_items if it.id in item_ids]
        briefs = [_item_to_brief(it) for it in valid_items]
        outfits = llm_result.get("outfits", [])
        packing_tip = llm_result.get("packing_tip", "")
        return CapsuleResponse(items=briefs, outfits=outfits, packing_tip=packing_tip)

    logger.info("胶囊衣橱 LLM 不可用，降级到规则引擎")
    return _capsule_fallback(all_items, req.days, req.occasions)

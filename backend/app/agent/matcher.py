"""
Rule-based clothing matcher.

Phase 1：规则过滤（温度/季节/天气）+ 随机组合 → 推荐。
Phase 2：filter_candidates 作为 LLM 的前置粗筛，match 作为 fallback。
"""

import logging
import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import ClothingItem, UserProfile, WearRecord
from app.schemas import WeatherInfo

logger = logging.getLogger(__name__)

# 品类 → 身体部位分组
UPPER_BODY = {"blouse", "tshirt", "hoodie", "sweater"}
OUTER_LAYER = {"outer"}
LOWER_BODY = {"pants", "shorts", "skirt"}
FULL_BODY = {"dress"}
FOOTWEAR = {"shoes"}
SIDE_ITEMS = {"bag", "accessory"}


def _season_label(month: int) -> str:
    if month in (3, 4, 5):
        return "春"
    elif month in (6, 7, 8):
        return "夏"
    elif month in (9, 10, 11):
        return "秋"
    else:
        return "冬"


def _match_season(item: ClothingItem, season_label: str) -> bool:
    if not item.seasons:
        return True
    return season_label in item.seasons


def _match_temp(item: ClothingItem, feels_like: int) -> bool:
    return item.temp_min <= feels_like <= item.temp_max


def _match_condition(item: ClothingItem, condition: str) -> bool:
    if condition in ("雨", "雷阵雨", "雪", "小雪"):
        water_sensitive = {"真丝", "羊毛", "羊绒", "皮草"}
        if any(m in water_sensitive for m in (item.material or [])):
            return False
    return True


def _get_recently_worn_ids(db: Session, user_id: int, days: int = 3) -> set[int]:
    since = date.today() - timedelta(days=days)
    records = db.query(WearRecord).filter(
        WearRecord.user_id == user_id,
        WearRecord.wear_date >= since,
    ).all()
    ids: set[int] = set()
    for r in records:
        ids.update(r.item_ids or [])
    return ids


def _weighted_pick(
    items: list[ClothingItem],
    scores: dict[int, float],
    recently_worn: set[int],
) -> ClothingItem:
    """按偏好分数加权随机选择，优先避免近期已穿过的物品。"""
    if not items:
        raise ValueError("候选列表为空")
    if len(items) == 1:
        return items[0]

    # 优先从非近期穿着中选，近期穿着降权
    weights = []
    for it in items:
        w = scores.get(it.id, 1.0)
        if it.id in recently_worn:
            w *= 0.15  # 近期穿过的降权
        weights.append(max(w, 0.01))

    return random.choices(items, weights=weights, k=1)[0]


def filter_candidates(
    db: Session,
    weather: WeatherInfo,
    user_id: int,
) -> dict[str, list[ClothingItem]]:
    """
    粗筛：根据天气条件过滤候选衣物，按品类分组返回。
    LLM 将在此基础上进行精排搭配。
    """
    today = date.today()
    season = _season_label(today.month)
    items = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.status == "available",
    ).all()

    by_category: dict[str, list[ClothingItem]] = {}

    for item in items:
        if (
            _match_temp(item, weather.feels_like)
            and _match_season(item, season)
            and _match_condition(item, weather.condition)
        ):
            cat = item.category
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(item)

    logger.debug(
        "粗筛结果: 总数=%d → 通过=%d (体感%d°C 季节=%s)",
        len(items), sum(len(v) for v in by_category.values()),
        weather.feels_like, season,
    )

    return by_category


def match(
    db: Session,
    weather: WeatherInfo,
    user_id: int,
    occasion: str = "",
    limit: int = 3,
    profile: UserProfile | None = None,
) -> list[dict]:
    """
    Fallback：规则组合 + 偏好加权随机 + 模板理由。
    LLM 不可用时使用。profile 非空时启用偏好加权。
    """
    from app.services.preferences import score_items_by_preferences

    by_category = filter_candidates(db, weather, user_id)
    recently_worn = _get_recently_worn_ids(db, user_id, days=3)

    # 按身体部位聚合候选
    upper_candidates = [it for cat in UPPER_BODY for it in by_category.get(cat, [])]
    lower_candidates = [it for cat in LOWER_BODY for it in by_category.get(cat, [])]
    outer_candidates = [it for cat in OUTER_LAYER for it in by_category.get(cat, [])]
    dress_candidates = [it for cat in FULL_BODY for it in by_category.get(cat, [])]
    shoes_candidates = [it for cat in FOOTWEAR for it in by_category.get(cat, [])]

    # 基础偏好评分（不包含 L4 共现）
    base_scores = score_items_by_preferences(by_category, profile)

    need_outer = weather.feels_like < 15 or weather.wind_level >= 5 or weather.condition in ("雨", "雷阵雨", "雪")

    suggestions: list[dict] = []

    for _ in range(limit):
        picked: list[ClothingItem] = []
        selected_ids: list[int] = []

        use_dress = dress_candidates and random.random() < 0.4
        if use_dress:
            dress = _weighted_pick(dress_candidates, base_scores, recently_worn)
            picked.append(dress)
            selected_ids.append(dress.id)
        else:
            if upper_candidates:
                upper = _weighted_pick(upper_candidates, base_scores, recently_worn)
                picked.append(upper)
                selected_ids.append(upper.id)

            # L4: 以已选上衣计算下装共现分数
            lower_scores = score_items_by_preferences(by_category, profile, selected_ids)
            # 合并基础分和共现分
            combined_lower = dict(base_scores)
            for iid, s in lower_scores.items():
                combined_lower[iid] = max(combined_lower.get(iid, 1.0), s)

            if lower_candidates:
                lower = _weighted_pick(lower_candidates, combined_lower, recently_worn)
                picked.append(lower)
                selected_ids.append(lower.id)

        if need_outer and outer_candidates:
            outer_scores = score_items_by_preferences(by_category, profile, selected_ids)
            combined_outer = dict(base_scores)
            for iid, s in outer_scores.items():
                combined_outer[iid] = max(combined_outer.get(iid, 1.0), s)
            picked.append(_weighted_pick(outer_candidates, combined_outer, recently_worn))

        if shoes_candidates:
            if weather.condition in ("雨", "雷阵雨"):
                waterproof = [s for s in shoes_candidates if s.sub_category in ("运动鞋", "靴子", "雨鞋")]
                if waterproof:
                    picked.append(_weighted_pick(waterproof, base_scores, recently_worn))
                    continue
            picked.append(_weighted_pick(shoes_candidates, base_scores, recently_worn))

        if not picked:
            continue

        names = [f"{p.sub_category}({p.colors[0] if p.colors else ''})" for p in picked]
        reason = f"今日{weather.condition}，体感温度{weather.feels_like}°C，"
        if occasion:
            reason += f"适合{occasion}场合。"
        reason += f"推荐：{' + '.join(names)}。"
        if need_outer:
            reason += "建议搭配外套以防降温。"
        if weather.condition in ("雨", "雷阵雨", "雪"):
            reason += "注意防雨/防滑。"

        suggestions.append({"items": picked, "reason": reason})

    return suggestions

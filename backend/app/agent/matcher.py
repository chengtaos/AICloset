"""
Rule-based clothing matcher.

Phase 1：规则过滤（温度/季节/天气）+ 随机组合 → 推荐。
Phase 2：filter_candidates 作为 LLM 的前置粗筛，match 作为 fallback。
"""

import logging
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
from app.models import ClothingItem, WearRecord
from app.schemas import WeatherInfo


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


def filter_candidates(
    db: Session,
    weather: WeatherInfo,
    user_id: int = 1,
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

    by_category: dict[str, list[ClothingItem]] = {
        "top": [], "bottom": [], "outer": [], "dress": [], "shoes": [],
    }

    for item in items:
        if (
            _match_temp(item, weather.feels_like)
            and _match_season(item, season)
            and _match_condition(item, weather.condition)
        ):
            cat = item.category
            if cat in by_category:
                by_category[cat].append(item)

    logger.debug(
        "粗筛结果: 总数=%d → top=%d bottom=%d outer=%d dress=%d shoes=%d (体感%d°C 季节=%s)",
        len(items),
        len(by_category["top"]), len(by_category["bottom"]),
        len(by_category["outer"]), len(by_category["dress"]), len(by_category["shoes"]),
        weather.feels_like, season,
    )

    return by_category


def match(
    db: Session,
    weather: WeatherInfo,
    user_id: int = 1,
    occasion: str = "",
    limit: int = 3,
) -> list[dict]:
    """
    Fallback：纯规则随机组合 + 模板理由。
    LLM 不可用时使用。
    """
    by_category = filter_candidates(db, weather, user_id)
    recently_worn = _get_recently_worn_ids(db, user_id, days=3)

    need_outer = weather.feels_like < 15 or weather.wind_level >= 5 or weather.condition in ("雨", "雷阵雨", "雪")

    suggestions: list[dict] = []

    for _ in range(limit):
        top_candidates = by_category.get("top", [])
        bottom_candidates = by_category.get("bottom", [])
        dress_candidates = by_category.get("dress", [])
        outer_candidates = by_category.get("outer", [])
        shoes_candidates = by_category.get("shoes", [])

        picked: list[ClothingItem] = []

        use_dress = dress_candidates and random.random() < 0.4
        if use_dress:
            dress = random.choice(dress_candidates)
            if len(dress_candidates) > 1:
                for _tries in range(5):
                    if dress.id not in recently_worn:
                        break
                    dress = random.choice(dress_candidates)
            picked.append(dress)
        else:
            if top_candidates:
                top = random.choice(top_candidates)
                if len(top_candidates) > 1:
                    for _tries in range(5):
                        if top.id not in recently_worn:
                            break
                        top = random.choice(top_candidates)
                picked.append(top)

            if bottom_candidates:
                bottom = random.choice(bottom_candidates)
                if len(bottom_candidates) > 1:
                    for _tries in range(5):
                        if bottom.id not in recently_worn:
                            break
                        bottom = random.choice(bottom_candidates)
                picked.append(bottom)

        if need_outer and outer_candidates:
            outer = random.choice(outer_candidates)
            picked.append(outer)

        if shoes_candidates:
            shoes = random.choice(shoes_candidates)
            if weather.condition in ("雨", "雷阵雨"):
                waterproof = [s for s in shoes_candidates if s.sub_category in ("运动鞋", "靴子", "雨鞋")]
                if waterproof:
                    shoes = random.choice(waterproof)
            picked.append(shoes)

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

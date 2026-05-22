"""
多级记忆偏好引擎。

L2 短期偏好（14天滑动窗口，7天半衰期）
L3 长期档案（春夏秋冬独立偏好向量，90天半衰期）
L4 关系记忆（物品共现对 + 品类搭配模式）

从穿着历史和推荐反馈中学习，注入 LLM 提示词和规则引擎。
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import ClothingItem, UserProfile

logger = logging.getLogger(__name__)

# ── 季节工具 ──

def _get_current_season() -> str:
    month = datetime.now().month
    if month in (3, 4, 5):
        return "春"
    elif month in (6, 7, 8):
        return "夏"
    elif month in (9, 10, 11):
        return "秋"
    else:
        return "冬"


def _get_adjacent_seasons(season: str) -> list[str]:
    order = ["春", "夏", "秋", "冬"]
    idx = order.index(season)
    result = []
    if idx > 0:
        result.append(order[idx - 1])
    if idx < len(order) - 1:
        result.append(order[idx + 1])
    return result


# ── 时间衰减 ──

def apply_decay(counts: dict, last_updated: datetime | None, half_life_days: float) -> dict:
    """指数衰减：每过半衰期，权重减半。last_updated 为空时不做衰减。"""
    if not counts or not last_updated:
        return dict(counts or {})
    days_elapsed = (datetime.now() - last_updated).days
    if days_elapsed <= 0:
        return dict(counts)
    decay = 0.5 ** (days_elapsed / half_life_days)
    return {k: v * decay for k, v in counts.items()}


# ── Profile 获取 ──

def _get_or_create_profile(db: Session, user_id: int) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    return profile


# ── 多级偏好更新 ──

def _increment_counts(target: dict, keys: list[str], weight: float = 1.0) -> dict:
    """向 dict 中增量更新计数。"""
    result = dict(target or {})
    for k in keys:
        result[k] = result.get(k, 0.0) + weight
    return result


def update_preferences_on_wear(
    db: Session,
    user_id: int,
    item_ids: list[int],
    occasion: str = "",
) -> None:
    """穿着记录后增量更新 L2/L3/L4 三级偏好。"""
    profile = _get_or_create_profile(db, user_id)
    items = db.query(ClothingItem).filter(ClothingItem.id.in_(item_ids)).all()
    if not items:
        return

    now = datetime.now()
    season = _get_current_season()
    adjacent = _get_adjacent_seasons(season)

    # ── L2: 短期偏好（14天滑动窗口）──
    # 先做一次衰减，再叠加新数据
    l2_styles = apply_decay(profile.short_term_styles or {}, profile.short_term_updated, 7)
    l2_colors = apply_decay(profile.short_term_colors or {}, profile.short_term_updated, 7)
    l2_cats = apply_decay(profile.short_term_categories or {}, profile.short_term_updated, 7)

    for item in items:
        l2_styles = _increment_counts(l2_styles, item.style_tags or [])
        l2_colors = _increment_counts(l2_colors, item.colors or [])
        l2_cats = _increment_counts(l2_cats, [item.category])

    profile.short_term_styles = l2_styles
    profile.short_term_colors = l2_colors
    profile.short_term_categories = l2_cats
    profile.short_term_updated = now
    profile.l2_event_count = (profile.l2_event_count or 0) + 1

    # ── L3: 长期档案（季节感知）──
    seasonal_styles = dict(profile.seasonal_styles or {})
    seasonal_colors = dict(profile.seasonal_colors or {})
    seasonal_cats = dict(profile.seasonal_categories or {})
    seasonal_temp = dict(profile.seasonal_temp or {})

    # 当前季节：全权重 1.0
    ss = dict(seasonal_styles.get(season, {}))
    sc = dict(seasonal_colors.get(season, {}))
    sct = dict(seasonal_cats.get(season, {}))
    for item in items:
        ss = _increment_counts(ss, item.style_tags or [])
        sc = _increment_counts(sc, item.colors or [])
        sct = _increment_counts(sct, [item.category])
    seasonal_styles[season] = ss
    seasonal_colors[season] = sc
    seasonal_cats[season] = sct

    # 相邻季节：0.3x 权重（过渡期）
    for adj in adjacent:
        adj_s = dict(seasonal_styles.get(adj, {}))
        adj_c = dict(seasonal_colors.get(adj, {}))
        adj_ct = dict(seasonal_cats.get(adj, {}))
        for item in items:
            adj_s = _increment_counts(adj_s, item.style_tags or [], 0.3)
            adj_c = _increment_counts(adj_c, item.colors or [], 0.3)
            adj_ct = _increment_counts(adj_ct, [item.category], 0.3)
        seasonal_styles[adj] = adj_s
        seasonal_colors[adj] = adj_c
        seasonal_cats[adj] = adj_ct

    # 学习当前季节的温度舒适区间
    temp_min = min(item.temp_min for item in items)
    temp_max = max(item.temp_max for item in items)
    existing_temp = seasonal_temp.get(season, [])
    if existing_temp and len(existing_temp) == 2:
        # EMA 平滑：新值权重 0.3，旧值权重 0.7
        seasonal_temp[season] = [
            int(existing_temp[0] * 0.7 + temp_min * 0.3),
            int(existing_temp[1] * 0.7 + temp_max * 0.3),
        ]
    else:
        seasonal_temp[season] = [temp_min, temp_max]

    profile.seasonal_styles = seasonal_styles
    profile.seasonal_colors = seasonal_colors
    profile.seasonal_categories = seasonal_cats
    profile.seasonal_temp = seasonal_temp
    profile.l3_event_count = (profile.l3_event_count or 0) + 1

    # ── L3: 场合偏好 ──
    if occasion:
        occasion_prefs = dict(profile.occasion_prefs or {})
        occ_entry = dict(occasion_prefs.get(occasion, {}))
        occ_styles = dict(occ_entry.get("styles", {}))
        occ_cats = dict(occ_entry.get("categories", {}))
        for item in items:
            occ_styles = _increment_counts(occ_styles, item.style_tags or [])
            occ_cats = _increment_counts(occ_cats, [item.category])
        occ_entry["styles"] = occ_styles
        occ_entry["categories"] = occ_cats
        occasion_prefs[occasion] = occ_entry
        profile.occasion_prefs = occasion_prefs

    # ── L4: 关系记忆 ──
    update_item_pairs(profile, item_ids)

    # ── 元信息 ──
    profile.total_wear_events = (profile.total_wear_events or 0) + 1
    profile.last_updated = now
    db.commit()
    logger.info(
        "多级偏好已更新: user=%d events=%d season=%s items=%s occasion=%s",
        user_id, profile.total_wear_events, season, item_ids, occasion,
    )


def update_item_pairs(profile: UserProfile, item_ids: list[int]) -> None:
    """更新物品共现矩阵和品类搭配模式。"""
    items = sorted(set(item_ids))
    if len(items) < 2:
        return

    # 物品共现对
    item_pairs = dict(profile.item_pairs or {})
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i], items[j]
            pair_key = f"{a}_{b}" if a < b else f"{b}_{a}"
            item_pairs[pair_key] = item_pairs.get(pair_key, 0) + 1
    profile.item_pairs = item_pairs
    profile.l4_event_count = len(item_pairs)

    # 品类组合（延迟查询，避免在此处引入 DB 依赖）
    # 由调用方在 wardrobe.record_wear 中完成 item 查询后调用
    # 这里仅做 item_id 级别的共现


def update_category_pairs_from_items(profile: UserProfile, items: list[ClothingItem]) -> None:
    """根据已查询的 ClothingItem 列表更新品类共现对。"""
    if len(items) < 2:
        return
    category_pairs = dict(profile.category_pairs or {})
    cats = sorted(item.category for item in items)
    for i in range(len(cats)):
        for j in range(i + 1, len(cats)):
            pair_key = f"{cats[i]}_{cats[j]}"
            category_pairs[pair_key] = category_pairs.get(pair_key, 0) + 1
    profile.category_pairs = category_pairs


def suppress_items_in_preferences(db: Session, user_id: int, item_ids: list[int]) -> None:
    """将不喜欢的衣物加入黑名单。"""
    profile = _get_or_create_profile(db, user_id)
    disliked = set(profile.disliked_items or [])
    for iid in item_ids:
        disliked.add(iid)
    profile.disliked_items = list(disliked)
    db.commit()
    logger.info("已屏蔽不喜欢的衣物: %s", item_ids)


# ── 多级偏好 LLM Prompt 生成 ──

def format_preferences_for_llm(profile: UserProfile | None) -> str:
    """将多级记忆转为结构化 LLM 提示词。

    冷启动分级：
    - 无 profile → 返回 ""
    - L2 未激活（l2 < 3 且 recent 无数据）→ 不展示近期偏好
    - L3 未激活（l3 < 3）→ 不展示季节偏好
    - L4 未激活（< 5 对）→ 不展示经典搭配
    """
    if not profile:
        return ""

    total = profile.total_wear_events or 0
    if total < 2:
        return ""

    sections: list[str] = []

    # ── L2: 短期偏好 ──
    l2_count = profile.l2_event_count or 0
    st_styles = apply_decay(profile.short_term_styles or {}, profile.short_term_updated, 7)
    if l2_count >= 2 and st_styles:
        top_styles = sorted(st_styles.items(), key=lambda x: -x[1])[:3]
        top_colors = sorted(
            apply_decay(profile.short_term_colors or {}, profile.short_term_updated, 7).items(),
            key=lambda x: -x[1],
        )[:3]
        top_cats = sorted(
            apply_decay(profile.short_term_categories or {}, profile.short_term_updated, 7).items(),
            key=lambda x: -x[1],
        )[:3]

        lines = ["### 近期偏好（近两周）"]
        if top_styles:
            total_s = sum(c for _, c in top_styles) or 1
            lines.append("风格：" + "、".join(f"{s}({c/total_s:.0%})" for s, c in top_styles))
        if top_cats:
            total_c = sum(c for _, c in top_cats) or 1
            lines.append("品类：" + "、".join(f"{s}({c/total_c:.0%})" for s, c in top_cats))
        if top_colors:
            lines.append("颜色：" + "、".join(f"{s}({c:.0f})" for s, c in top_colors))
        sections.append("\n".join(lines))

    # ── L3: 季节偏好 ──
    l3_count = profile.l3_event_count or 0
    season = _get_current_season()
    if l3_count >= 2:
        se_styles = (profile.seasonal_styles or {}).get(season, {})
        se_colors = (profile.seasonal_colors or {}).get(season, {})
        se_temp = (profile.seasonal_temp or {}).get(season, [])

        # 融合相邻季节（0.3x）
        adjacent = _get_adjacent_seasons(season)
        for adj in adjacent:
            for k, v in (profile.seasonal_styles or {}).get(adj, {}).items():
                se_styles[k] = se_styles.get(k, 0) + v * 0.3
            for k, v in (profile.seasonal_colors or {}).get(adj, {}).items():
                se_colors[k] = se_colors.get(k, 0) + v * 0.3

        if se_styles or se_colors:
            lines = [f"### 季节偏好（{season}季）"]
            top_styles = sorted(se_styles.items(), key=lambda x: -x[1])[:3]
            if top_styles:
                total_s = sum(c for _, c in top_styles) or 1
                lines.append("风格：" + "、".join(f"{s}({c/total_s:.0%})" for s, c in top_styles))
            top_colors = sorted(se_colors.items(), key=lambda x: -x[1])[:3]
            if top_colors:
                lines.append("颜色：" + "、".join(f"{s}({c:.0f})" for s, c in top_colors))
            if se_temp and len(se_temp) == 2:
                lines.append(f"舒适温度：{se_temp[0]}~{se_temp[1]}°C")
            sections.append("\n".join(lines))

    # ── L4: 经典搭配 ──
    item_pairs = profile.item_pairs or {}
    if len(item_pairs) >= 3:
        top_pairs = sorted(item_pairs.items(), key=lambda x: -x[1])[:3]
        lines = ["### 经典搭配"]
        for pair_key, count in top_pairs:
            ids = pair_key.split("_")
            lines.append(f"- 衣物#{ids[0]} + 衣物#{ids[1]}（穿过{count}次）")
        sections.append("\n".join(lines))

    # ── 不喜欢的衣物 ──
    if profile.disliked_items:
        sections.append(f"### 不喜欢的衣物\n- 请避免推荐这些衣物ID：{profile.disliked_items}")

    if not sections:
        return ""

    return "## 你的穿搭记忆\n\n" + "\n\n".join(sections) + "\n\n请综合记忆信息与当前天气、场合进行搭配推荐。"


# ── 多级评分（Fallback 规则引擎用）──

def score_items_by_preferences(
    candidates: dict[str, list[ClothingItem]],
    profile: UserProfile | None,
    selected_items: list[int] | None = None,
) -> dict[int, float]:
    """多级融合评分：L2 短期 + L3 季节 + L4 共现 + 惩罚项。

    selected_items: 已选定的物品 ID，用于 L4 共现加分。
    冷启动时返回空 dict。
    """
    if not profile or (profile.total_wear_events or 0) < 2:
        return {}

    selected = set(selected_items or [])
    season = _get_current_season()
    adjacent = _get_adjacent_seasons(season)
    disliked = set(profile.disliked_items or [])

    # L2: 衰减后的短期偏好
    l2_styles = apply_decay(profile.short_term_styles or {}, profile.short_term_updated, 7)
    l2_colors = apply_decay(profile.short_term_colors or {}, profile.short_term_updated, 7)
    l2_cats = apply_decay(profile.short_term_categories or {}, profile.short_term_updated, 7)
    l2_activated = (profile.l2_event_count or 0) >= 2 and any(l2_styles.values())

    # L3: 当前季节 + 相邻季节融合
    se_styles = dict((profile.seasonal_styles or {}).get(season, {}))
    se_colors = dict((profile.seasonal_colors or {}).get(season, {}))
    se_cats = dict((profile.seasonal_categories or {}).get(season, {}))
    for adj in adjacent:
        for k, v in (profile.seasonal_styles or {}).get(adj, {}).items():
            se_styles[k] = se_styles.get(k, 0) + v * 0.3
        for k, v in (profile.seasonal_colors or {}).get(adj, {}).items():
            se_colors[k] = se_colors.get(k, 0) + v * 0.3
        for k, v in (profile.seasonal_categories or {}).get(adj, {}).items():
            se_cats[k] = se_cats.get(k, 0) + v * 0.3
    l3_activated = (profile.l3_event_count or 0) >= 2

    # L4: 共现对
    item_pairs = profile.item_pairs or {}
    l4_activated = len(item_pairs) >= 3

    # 归一化：各维度最大值
    def _max_val(d: dict) -> float:
        return max(d.values()) if d else 1.0

    l2_styles_max = _max_val(l2_styles)
    l2_colors_max = _max_val(l2_colors)
    l2_cats_max = _max_val(l2_cats)
    se_styles_max = _max_val(se_styles)
    se_colors_max = _max_val(se_colors)
    se_cats_max = _max_val(se_cats)
    pairs_max = _max_val(item_pairs)

    scores: dict[int, float] = {}
    for items in candidates.values():
        for item in items:
            score = 1.0

            # L2: 短期偏好 boost（权重 0.08/命中）
            if l2_activated:
                for tag in (item.style_tags or []):
                    score += (l2_styles.get(tag, 0) / l2_styles_max) * 0.08
                for c in (item.colors or []):
                    score += (l2_colors.get(c, 0) / l2_colors_max) * 0.05
                score += (l2_cats.get(item.category, 0) / l2_cats_max) * 0.06

            # L3: 季节偏好 boost（权重 0.04/命中）
            if l3_activated:
                for tag in (item.style_tags or []):
                    score += (se_styles.get(tag, 0) / se_styles_max) * 0.04
                for c in (item.colors or []):
                    score += (se_colors.get(c, 0) / se_colors_max) * 0.03
                score += (se_cats.get(item.category, 0) / se_cats_max) * 0.03

            # L4: 共现亲和（与已选物品的搭配度）
            if l4_activated and selected and pairs_max > 0:
                for sid in selected:
                    a, b = (sid, item.id) if sid < item.id else (item.id, sid)
                    pair_key = f"{a}_{b}"
                    pair_count = item_pairs.get(pair_key, 0)
                    score += (pair_count / pairs_max) * 0.1

            # 不喜欢的物品惩罚
            if item.id in disliked:
                score *= 0.15

            scores[item.id] = score

    return scores

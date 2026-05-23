"""
多级记忆偏好引擎。

L2 短期偏好（14天滑动窗口，7天半衰期）— 快速累积，快速遗忘，相当于工作记忆
L3 长期档案（春夏秋冬独立偏好向量，90天半衰期）— 仅通过 Consolidation 从 L2 提升
L4 关系记忆（物品共现对 + 品类搭配模式）— Top-100 容量裁剪

生命周期：编码(importance) → L2累积 → Consolidation(L2→L3) → 遗忘(衰减+L4裁剪)

从穿着历史和推荐反馈中学习，注入 LLM 提示词和规则引擎。
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import ClothingItem, UserProfile

logger = logging.getLogger(__name__)

# L2 → L3 提升阈值：同一风格/颜色/品类在 L2 累积 ≥3 次后确认
CONSOLIDATION_THRESHOLD = 3.0
# L4 物品共现对容量上限
MAX_ITEM_PAIRS = 100

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


# ── 增量计数 ──

def _increment_counts(target: dict, keys: list[str], weight: float = 1.0) -> dict:
    """向 dict 中增量更新计数。"""
    result = dict(target or {})
    for k in keys:
        result[k] = result.get(k, 0.0) + weight
    return result


def _multiply_counts(counts: dict, keys: list[str], factor: float) -> dict:
    """对 dict 中指定 key 乘以系数。"""
    result = dict(counts)
    for k in keys:
        if k in result:
            result[k] = result[k] * factor
    return result


# ── 重要性计算 ──

def _compute_importance(items: list[ClothingItem]) -> dict[int, float]:
    """计算每件衣物的事件重要性权重。

    - 首次穿着（wear_count == 0 before increment → now == 1）：2.0（探索期激励）
    - 正常穿着：1.0
    """
    result: dict[int, float] = {}
    for item in items:
        if (item.wear_count or 0) <= 1:
            result[item.id] = 2.0
        else:
            result[item.id] = 1.0
    return result


# ── Consolidation: L2 → L3 ──

def _consolidate_l2_to_l3(
    l2_styles: dict,
    l2_colors: dict,
    l2_cats: dict,
    seasonal_styles: dict,
    seasonal_colors: dict,
    seasonal_cats: dict,
    seasonal_updated: dict,
    season: str,
    adjacent: list[str],
    now: datetime,
) -> tuple[dict, dict, dict, dict, dict, dict, dict, int]:
    """将 L2 中达到阈值的模式提升到 L3，并重置 L2 对应项。

    返回更新后的 (l2_styles, l2_colors, l2_cats,
                  seasonal_styles, seasonal_colors, seasonal_cats,
                  seasonal_updated, promoted_count)。
    """
    promoted = 0

    def _consolidate(l2: dict, se: dict) -> tuple[dict, dict, int]:
        count = 0
        for key, val in list(l2.items()):
            if val >= CONSOLIDATION_THRESHOLD:
                # 当前季节全权重
                se_cur = dict(se.get(season, {}))
                se_cur[key] = se_cur.get(key, 0.0) + val
                se[season] = se_cur
                # 相邻季节 0.3x
                for adj in adjacent:
                    se_adj = dict(se.get(adj, {}))
                    se_adj[key] = se_adj.get(key, 0.0) + val * 0.3
                    se[adj] = se_adj
                l2[key] = 0.0
                count += 1
        return l2, se, count

    l2_styles, seasonal_styles, c1 = _consolidate(l2_styles, seasonal_styles)
    l2_colors, seasonal_colors, c2 = _consolidate(l2_colors, seasonal_colors)
    l2_cats, seasonal_cats, c3 = _consolidate(l2_cats, seasonal_cats)
    promoted = c1 + c2 + c3

    if promoted > 0:
        for s in [season] + adjacent:
            seasonal_updated[s] = now.isoformat()

    return (
        l2_styles, l2_colors, l2_cats,
        seasonal_styles, seasonal_colors, seasonal_cats,
        seasonal_updated, promoted,
    )


# ── 多级偏好更新（主入口）──

def update_preferences_on_wear(
    db: Session,
    user_id: int,
    item_ids: list[int],
    occasion: str = "",
) -> None:
    """穿着记录后更新多级偏好。

    流程：计算重要性 → L2 衰减+加权累积 → Consolidation(L2→L3) → L4 裁剪。
    """
    profile = _get_or_create_profile(db, user_id)
    items = db.query(ClothingItem).filter(ClothingItem.id.in_(item_ids)).all()
    if not items:
        return

    now = datetime.now()
    season = _get_current_season()
    adjacent = _get_adjacent_seasons(season)
    importance = _compute_importance(items)

    # ── L2: 短期偏好 — 衰减 + 重要性加权累积 ──
    l2_styles = apply_decay(profile.short_term_styles or {}, profile.short_term_updated, 7)
    l2_colors = apply_decay(profile.short_term_colors or {}, profile.short_term_updated, 7)
    l2_cats = apply_decay(profile.short_term_categories or {}, profile.short_term_updated, 7)

    for item in items:
        imp = importance.get(item.id, 1.0)
        l2_styles = _increment_counts(l2_styles, item.style_tags or [], imp)
        l2_colors = _increment_counts(l2_colors, item.colors or [], imp)
        l2_cats = _increment_counts(l2_cats, [item.category], imp)

    # ── Consolidation: L2 达标项提升到 L3 ──
    seasonal_updated = dict(profile.seasonal_updated or {})
    seasonal_styles = dict(profile.seasonal_styles or {})
    seasonal_colors = dict(profile.seasonal_colors or {})
    seasonal_cats = dict(profile.seasonal_categories or {})
    seasonal_temp = dict(profile.seasonal_temp or {})

    (
        l2_styles, l2_colors, l2_cats,
        seasonal_styles, seasonal_colors, seasonal_cats,
        seasonal_updated, promoted_count,
    ) = _consolidate_l2_to_l3(
        l2_styles, l2_colors, l2_cats,
        seasonal_styles, seasonal_colors, seasonal_cats,
        seasonal_updated, season, adjacent, now,
    )

    profile.short_term_styles = l2_styles
    profile.short_term_colors = l2_colors
    profile.short_term_categories = l2_cats
    profile.short_term_updated = now
    profile.l2_event_count = (profile.l2_event_count or 0) + 1

    # ── L3: 温度舒适区间（直接更新，不走 Consolidation）──
    temp_min = min(item.temp_min for item in items)
    temp_max = max(item.temp_max for item in items)
    existing_temp = seasonal_temp.get(season, [])
    if existing_temp and len(existing_temp) == 2:
        seasonal_temp[season] = [
            int(existing_temp[0] * 0.7 + temp_min * 0.3),
            int(existing_temp[1] * 0.7 + temp_max * 0.3),
        ]
    else:
        seasonal_temp[season] = [temp_min, temp_max]

    profile.seasonal_updated = seasonal_updated
    profile.seasonal_styles = seasonal_styles
    profile.seasonal_colors = seasonal_colors
    profile.seasonal_categories = seasonal_cats
    profile.seasonal_temp = seasonal_temp
    if promoted_count > 0:
        profile.l3_event_count = (profile.l3_event_count or 0) + 1

    # ── L3: 场合偏好（直接更新）──
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

    # ── L4: 关系记忆（含容量裁剪）──
    update_item_pairs(profile, item_ids)

    # ── 元信息 ──
    profile.total_wear_events = (profile.total_wear_events or 0) + 1
    profile.last_updated = now
    db.commit()
    logger.info(
        "多级偏好已更新: user=%d events=%d season=%s items=%s importance=%s occasion=%s promoted=%d",
        user_id, profile.total_wear_events, season, item_ids,
        {k: v for k, v in importance.items() if v != 1.0},
        occasion, promoted_count,
    )


# ── L4: 关系记忆 ──

def update_item_pairs(profile: UserProfile, item_ids: list[int]) -> None:
    """更新物品共现矩阵（含容量裁剪：只保留 Top-100 高频对）。"""
    items = sorted(set(item_ids))
    if len(items) < 2:
        return

    item_pairs = dict(profile.item_pairs or {})
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i], items[j]
            pair_key = f"{a}_{b}" if a < b else f"{b}_{a}"
            item_pairs[pair_key] = item_pairs.get(pair_key, 0) + 1

    # 容量裁剪：保留 Top-100
    if len(item_pairs) > MAX_ITEM_PAIRS:
        sorted_pairs = sorted(item_pairs.items(), key=lambda x: -x[1])
        item_pairs = dict(sorted_pairs[:MAX_ITEM_PAIRS])
        logger.info("L4 共现对裁剪: %d → %d", len(sorted_pairs), len(item_pairs))

    profile.item_pairs = item_pairs
    profile.l4_event_count = len(item_pairs)


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


# ── 屏蔽 / 负向微调 ──

def suppress_items_in_preferences(db: Session, user_id: int, item_ids: list[int]) -> None:
    """将不喜欢的衣物加入黑名单，并对 L2 短期向量做负向微调。

    负向策略：对 disliked 物品的风格/颜色/品类在 L2 短期向量中 ×0.5（腰斩），
    让系统感知到"最近不太喜欢这类风格"，而不是仅屏蔽具体物品 ID。
    """
    profile = _get_or_create_profile(db, user_id)

    disliked = set(profile.disliked_items or [])
    for iid in item_ids:
        disliked.add(iid)
    profile.disliked_items = list(disliked)

    items = db.query(ClothingItem).filter(ClothingItem.id.in_(item_ids)).all()
    if items:
        styles = dict(profile.short_term_styles or {})
        colors = dict(profile.short_term_colors or {})
        cats = dict(profile.short_term_categories or {})
        for item in items:
            styles = _multiply_counts(styles, item.style_tags or [], 0.5)
            colors = _multiply_counts(colors, item.colors or [], 0.5)
            cats = _multiply_counts(cats, [item.category], 0.5)
        profile.short_term_styles = styles
        profile.short_term_colors = colors
        profile.short_term_categories = cats

    db.commit()
    logger.info("已屏蔽不喜欢的衣物并负向微调 L2 向量: items=%s", item_ids)


# ── 多级偏好 LLM Prompt 生成 ──

def format_preferences_for_llm(profile: UserProfile | None) -> str:
    """将多级记忆转为结构化 LLM 提示词。"""
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
        seasonal_updated = profile.seasonal_updated or {}
        last_upd = seasonal_updated.get(season)
        if isinstance(last_upd, str):
            last_upd = datetime.fromisoformat(last_upd)
        se_styles = apply_decay((profile.seasonal_styles or {}).get(season, {}), last_upd, 90)
        se_colors = apply_decay((profile.seasonal_colors or {}).get(season, {}), last_upd, 90)
        se_temp = (profile.seasonal_temp or {}).get(season, [])

        adjacent = _get_adjacent_seasons(season)
        for adj in adjacent:
            adj_upd = seasonal_updated.get(adj)
            if isinstance(adj_upd, str):
                adj_upd = datetime.fromisoformat(adj_upd)
            adj_styles = apply_decay((profile.seasonal_styles or {}).get(adj, {}), adj_upd, 90)
            adj_colors = apply_decay((profile.seasonal_colors or {}).get(adj, {}), adj_upd, 90)
            for k, v in adj_styles.items():
                se_styles[k] = se_styles.get(k, 0) + v * 0.3
            for k, v in adj_colors.items():
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
    """多级融合评分：L2 短期 + L3 季节 + L4 共现 + 惩罚项。"""
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

    # L3: 当前季节 + 相邻季节融合（90天衰减）
    seasonal_updated = profile.seasonal_updated or {}
    last_upd = seasonal_updated.get(season)
    if isinstance(last_upd, str):
        last_upd = datetime.fromisoformat(last_upd)
    se_styles = apply_decay((profile.seasonal_styles or {}).get(season, {}), last_upd, 90)
    se_colors = apply_decay((profile.seasonal_colors or {}).get(season, {}), last_upd, 90)
    se_cats = apply_decay((profile.seasonal_categories or {}).get(season, {}), last_upd, 90)
    for adj in adjacent:
        adj_upd = seasonal_updated.get(adj)
        if isinstance(adj_upd, str):
            adj_upd = datetime.fromisoformat(adj_upd)
        adj_s = apply_decay((profile.seasonal_styles or {}).get(adj, {}), adj_upd, 90)
        adj_c = apply_decay((profile.seasonal_colors or {}).get(adj, {}), adj_upd, 90)
        adj_ct = apply_decay((profile.seasonal_categories or {}).get(adj, {}), adj_upd, 90)
        for k, v in adj_s.items():
            se_styles[k] = se_styles.get(k, 0) + v * 0.3
        for k, v in adj_c.items():
            se_colors[k] = se_colors.get(k, 0) + v * 0.3
        for k, v in adj_ct.items():
            se_cats[k] = se_cats.get(k, 0) + v * 0.3
    l3_activated = (profile.l3_event_count or 0) >= 2

    # L4: 共现对
    item_pairs = profile.item_pairs or {}
    l4_activated = len(item_pairs) >= 3

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

            if l2_activated:
                for tag in (item.style_tags or []):
                    score += (l2_styles.get(tag, 0) / l2_styles_max) * 0.08
                for c in (item.colors or []):
                    score += (l2_colors.get(c, 0) / l2_colors_max) * 0.05
                score += (l2_cats.get(item.category, 0) / l2_cats_max) * 0.06

            if l3_activated:
                for tag in (item.style_tags or []):
                    score += (se_styles.get(tag, 0) / se_styles_max) * 0.04
                for c in (item.colors or []):
                    score += (se_colors.get(c, 0) / se_colors_max) * 0.03
                score += (se_cats.get(item.category, 0) / se_cats_max) * 0.03

            if l4_activated and selected and pairs_max > 0:
                for sid in selected:
                    a, b = (sid, item.id) if sid < item.id else (item.id, sid)
                    pair_key = f"{a}_{b}"
                    pair_count = item_pairs.get(pair_key, 0)
                    score += (pair_count / pairs_max) * 0.1

            if item.id in disliked:
                score *= 0.15

            scores[item.id] = score

    return scores

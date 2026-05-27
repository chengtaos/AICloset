import os
from datetime import date
from pathlib import Path
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ClothingItem, Outfit, UserProfile, WearRecord
from app.schemas import (
    CategoryStat,
    ClothingItemBrief,
    ClothingItemCreate,
    ClothingItemUpdate,
    WardrobeStats,
)

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


def list_items(
    db: Session,
    user_id: int,
    category: Optional[str] = None,
    season: Optional[str] = None,
    style: Optional[str] = None,
    status: str = "available",
    search: Optional[str] = None,
    sort: str = "created_at",
):
    """查询衣物列表，支持分类、季节、风格等多条件筛选和排序。"""
    q = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.status == status,
    )
    if category:
        q = q.filter(ClothingItem.category == category)
    if season:
        q = q.filter(ClothingItem.seasons.contains(season))
    if style:
        q = q.filter(ClothingItem.style_tags.contains(style))
    if search:
        q = q.filter(ClothingItem.sub_category.contains(search))

    sort_map = {
        "created_at": ClothingItem.created_at.desc(),
        "-created_at": ClothingItem.created_at.asc(),
        "wear_count": ClothingItem.wear_count.desc(),
        "-wear_count": ClothingItem.wear_count.asc(),
    }
    order_by = sort_map.get(sort, ClothingItem.created_at.desc())
    items = q.order_by(order_by).all()

    # 批量查询最后穿着日期，避免对每件衣物单独查 WearRecord（N+1）
    item_ids = [it.id for it in items]
    last_worn_map: dict[int, date] = {}
    if item_ids:
        item_id_set = set(item_ids)
        rows = (
            db.query(WearRecord.item_ids, WearRecord.wear_date)
            .filter(WearRecord.user_id == user_id)
            .order_by(WearRecord.wear_date.desc())
            .all()
        )
        seen: set[int] = set()
        for row_item_ids, wear_date in rows:
            for iid in (row_item_ids or []):
                if iid in seen or iid not in item_id_set:
                    continue
                seen.add(iid)
                # 行已按 wear_date 降序，首次遇到即为最后穿着日期
                if wear_date:
                    last_worn_map[iid] = wear_date

    # 将 last_worn_date 作为动态属性注入 ORM 对象，Pydantic from_attributes 可读取
    for it in items:
        it.last_worn_date = last_worn_map.get(it.id)  # type: ignore[attr-defined]

    return items


def get_item(db: Session, item_id: int, user_id: int = 1) -> Optional[ClothingItem]:
    """按 ID 获取单件衣物。"""
    return db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == user_id,
    ).first()


def create_item(db: Session, data: ClothingItemCreate, user_id: int = 1) -> ClothingItem:
    """创建新衣物，image_path 会作为首张图片存入 images 列表。"""
    payload = data.model_dump()
    image_path = payload.pop("image_path", None)
    item = ClothingItem(user_id=user_id, **payload)
    if image_path:
        item.images = [image_path]
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: int, data: ClothingItemUpdate, user_id: int = 1) -> Optional[ClothingItem]:
    """更新衣物字段，仅更新传入的非空字段。"""
    item = get_item(db, item_id, user_id)
    if not item:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int, user_id: int = 1) -> bool:
    """硬删除衣物记录，同时清理本地图片文件。"""
    item = get_item(db, item_id, user_id)
    if not item:
        return False

    # 收集所有关联的本地图片路径
    image_paths = list(item.images or [])
    db.delete(item)
    db.commit()

    # 删除本地图片文件（忽略文件不存在的错误）
    for img_path in image_paths:
        try:
            full_path = UPLOAD_DIR.parent / img_path
            if full_path.exists():
                full_path.unlink()
        except Exception:
            pass

    return True


def add_image(db: Session, item_id: int, image_path: str, user_id: int = 1) -> Optional[ClothingItem]:
    """向衣物追加一张图片。"""
    item = get_item(db, item_id, user_id)
    if not item:
        return None
    images = list(item.images or [])
    images.append(image_path)
    item.images = images
    db.commit()
    db.refresh(item)
    return item


def _item_to_brief(item: ClothingItem) -> ClothingItemBrief:
    """将 ORM 对象转为轻量 Brief schema，供列表/统计场景使用。"""
    return ClothingItemBrief(
        id=item.id,
        name=item.name or "",
        category=item.category,
        sub_category=item.sub_category,
        colors=item.colors or [],
        images=item.images or [],
        style_tags=item.style_tags or [],
    )


def get_stats(db: Session, user_id: int = 1) -> WardrobeStats:
    """聚合衣橱统计数据：总价值、品类分布、颜色分布、穿着频次、沉睡单品。"""
    items = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.status == "available",
    ).all()

    total_value = sum(it.purchase_price or 0 for it in items)

    # 品类分布
    cat_counts: dict[str, int] = {}
    for it in items:
        cat_counts[it.category] = cat_counts.get(it.category, 0) + 1
    category_dist = [CategoryStat(category=k, count=v) for k, v in cat_counts.items()]

    # 颜色分布：取出现次数最多的前 10 种颜色
    color_counts: dict[str, int] = {}
    for it in items:
        for c in (it.colors or []):
            color_counts[c] = color_counts.get(c, 0) + 1
    color_dist = [
        CategoryStat(category=k, count=v)
        for k, v in sorted(color_counts.items(), key=lambda x: -x[1])[:10]
    ]

    # 穿着频次 Top5（仅包含至少穿过一次的）
    sorted_by_wear = sorted(items, key=lambda x: -x.wear_count)[:5]
    most_worn = [_item_to_brief(it) for it in sorted_by_wear if it.wear_count > 0]

    # 沉睡单品：超过30天未穿或从未穿过的衣物，最多展示 10 件
    from datetime import date, timedelta
    thirty_days_ago = date.today() - timedelta(days=30)

    # 批量计算最后穿着日期
    item_ids = [it.id for it in items]
    last_worn_map: dict[int, date] = {}
    if item_ids:
        item_id_set = set(item_ids)
        rows = (
            db.query(WearRecord.item_ids, WearRecord.wear_date)
            .filter(WearRecord.user_id == user_id)
            .order_by(WearRecord.wear_date.desc())
            .all()
        )
        seen: set[int] = set()
        for row_item_ids, wear_date in rows:
            for iid in (row_item_ids or []):
                if iid in seen or iid not in item_id_set:
                    continue
                seen.add(iid)
                if wear_date:
                    last_worn_map[iid] = wear_date

    sleeping = [
        it for it in items
        if (last_worn_map.get(it.id) or date(2000, 1, 1)) < thirty_days_ago
    ]
    sleeping_items = [_item_to_brief(it) for it in sleeping[:10]]

    return WardrobeStats(
        total_items=len(items),
        total_value=total_value,
        category_distribution=category_dist,
        color_distribution=color_dist,
        most_worn=most_worn,
        sleeping_items=sleeping_items,
    )


def record_wear(
    db: Session,
    user_id: int,
    outfit_id: Optional[int],
    item_ids: list[int],
    wear_date: Optional[date],
    note: str,
    occasion: str = "",
) -> WearRecord:
    """记录一次穿着，同时递增相关衣物的 wear_count 并更新多级偏好。"""
    record_date = wear_date or date.today()
    record = WearRecord(
        user_id=user_id,
        outfit_id=outfit_id,
        item_ids=item_ids,
        wear_date=record_date,
        note=note,
    )
    db.add(record)

    # 收集所有关联的衣物 ID：直接传入的散件 + 搭配中的衣物
    all_ids = set(item_ids)
    if outfit_id:
        outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
        if outfit and outfit.items:
            for oi in outfit.items:
                all_ids.add(oi["item_id"])

    # 批量递增穿着次数
    for iid in all_ids:
        item = db.query(ClothingItem).filter(ClothingItem.id == iid).first()
        if item:
            item.wear_count = (item.wear_count or 0) + 1

    # 更新用户多级偏好档案（L2/L3/L4）
    from app.services.preferences import update_preferences_on_wear, update_category_pairs_from_items
    update_preferences_on_wear(db, user_id, list(all_ids), occasion)

    # L4: 品类共现对
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        items = db.query(ClothingItem).filter(ClothingItem.id.in_(list(all_ids))).all()
        update_category_pairs_from_items(profile, items)

    db.commit()
    db.refresh(record)
    return record


# ── 基础款清单：每个衣橱都该有的单品 ──
# 格式：(品类, 子品类关键词, 为什么需要)
ESSENTIAL_BASICS = [
    ("tshirt", "白T恤", "百搭基础，单穿或内搭都合适"),
    ("tshirt", "黑打底衫", "显瘦百搭，叠穿必备"),
    ("blouse", "白衬衫", "通勤必备，正式与休闲皆可"),
    ("pants", "牛仔裤", "四季皆宜的基础下装"),
    ("pants", "黑色长裤", "通勤和正式场合的万能下装"),
    ("outer", "风衣", "春秋过渡季的经典外套"),
    ("outer", "西装外套", "正式场合与 smart-casual 必备"),
    ("dress", "小黑裙", "万能连衣裙，聚会到酒会皆可"),
    ("shoes", "白色运动鞋", "日常出行最百搭的鞋款"),
    ("shoes", "黑色皮鞋", "正式和通勤场合的必备鞋款"),
    ("sweater", "针织衫", "春秋内搭和叠穿的基础单品"),
    ("bag", "托特包", "日常通勤大容量包款"),
]


def get_gap_analysis(db: Session, user_id: int = 1):
    """分析衣橱缺口：检查基础款覆盖率，返回缺失的建议。"""
    from app.schemas import GapAnalysis, GapItem

    items = db.query(ClothingItem).filter(
        ClothingItem.user_id == user_id,
        ClothingItem.status != "archived",
    ).all()

    owned_by_category: dict[str, list[str]] = {}
    for it in items:
        cat = it.category
        if cat not in owned_by_category:
            owned_by_category[cat] = []
        owned_by_category[cat].append(it.sub_category)

    missing: list[GapItem] = []
    for cat, sub_keyword, reason in ESSENTIAL_BASICS:
        owned_subs = owned_by_category.get(cat, [])
        found = any(sub_keyword in s for s in owned_subs)
        if not found:
            missing.append(GapItem(
                category=cat,
                sub_category=sub_keyword,
                reason=reason,
            ))

    total = len(ESSENTIAL_BASICS)
    owned = total - len(missing)
    score = round(owned / total * 100) if total > 0 else 0

    return GapAnalysis(
        missing_items=missing,
        coverage_score=score,
        total_basics=total,
        owned_basics=owned,
    )


def get_wear_history(db: Session, user_id: int = 1, year: int = 0, month: int = 0):
    """查询穿着历史，支持按年月筛选。"""
    q = db.query(WearRecord).filter(WearRecord.user_id == user_id)
    if year:
        q = q.filter(func.strftime('%Y', WearRecord.wear_date) == str(year))
    if month:
        q = q.filter(func.strftime('%m', WearRecord.wear_date) == f"{month:02d}")
    return q.order_by(WearRecord.wear_date.desc()).all()

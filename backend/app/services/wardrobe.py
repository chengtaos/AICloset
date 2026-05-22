from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import ClothingItem, WearRecord
from app.schemas import ClothingItemCreate, ClothingItemUpdate, CategoryStat, WardrobeStats


def list_items(
    db: Session,
    user_id: int = 1,
    category: Optional[str] = None,
    season: Optional[str] = None,
    style: Optional[str] = None,
    status: str = "available",
    search: Optional[str] = None,
):
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
    return q.order_by(ClothingItem.updated_at.desc()).all()


def get_item(db: Session, item_id: int, user_id: int = 1) -> Optional[ClothingItem]:
    return db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == user_id,
    ).first()


def create_item(db: Session, data: ClothingItemCreate, user_id: int = 1) -> ClothingItem:
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
    item = get_item(db, item_id, user_id)
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def add_image(db: Session, item_id: int, image_path: str, user_id: int = 1) -> Optional[ClothingItem]:
    item = get_item(db, item_id, user_id)
    if not item:
        return None
    images = list(item.images or [])
    images.append(image_path)
    item.images = images
    db.commit()
    db.refresh(item)
    return item


def get_stats(db: Session, user_id: int = 1) -> WardrobeStats:
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

    # 颜色分布
    color_counts: dict[str, int] = {}
    for it in items:
        for c in (it.colors or []):
            color_counts[c] = color_counts.get(c, 0) + 1
    color_dist = [CategoryStat(category=k, count=v) for k, v in
                  sorted(color_counts.items(), key=lambda x: -x[1])[:10]]

    # 穿着频次 Top5
    sorted_by_wear = sorted(items, key=lambda x: -x.wear_count)[:5]
    most_worn = [_item_to_brief(it) for it in sorted_by_wear if it.wear_count > 0]

    # 沉睡单品（从未穿过的）
    sleeping = [it for it in items if it.wear_count == 0]
    sleeping_items = [_item_to_brief(it) for it in sleeping[:10]]

    return WardrobeStats(
        total_items=len(items),
        total_value=total_value,
        category_distribution=category_dist,
        color_distribution=color_dist,
        most_worn=most_worn,
        sleeping_items=sleeping_items,
    )


def record_wear(db: Session, user_id: int, outfit_id: Optional[int], item_ids: list[int], wear_date: Optional[date], note: str) -> WearRecord:
    record_date = wear_date or date.today()
    record = WearRecord(
        user_id=user_id,
        outfit_id=outfit_id,
        item_ids=item_ids,
        wear_date=record_date,
        note=note,
    )
    db.add(record)

    # 更新物品穿着次数
    all_ids = set(item_ids)
    if outfit_id:
        from app.models import Outfit
        outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
        if outfit and outfit.items:
            for oi in outfit.items:
                all_ids.add(oi["item_id"])

    for iid in all_ids:
        item = db.query(ClothingItem).filter(ClothingItem.id == iid).first()
        if item:
            item.wear_count = (item.wear_count or 0) + 1

    db.commit()
    db.refresh(record)
    return record


def get_wear_history(db: Session, user_id: int = 1, year: int = 0, month: int = 0):
    q = db.query(WearRecord).filter(WearRecord.user_id == user_id)
    if year:
        q = q.filter(func.strftime('%Y', WearRecord.wear_date) == str(year))
    if month:
        q = q.filter(func.strftime('%m', WearRecord.wear_date) == f"{month:02d}")
    return q.order_by(WearRecord.wear_date.desc()).all()


def _item_to_brief(item: ClothingItem):
    from app.schemas import ClothingItemBrief
    return ClothingItemBrief(
        id=item.id,
        category=item.category,
        sub_category=item.sub_category,
        colors=item.colors or [],
        images=item.images or [],
        style_tags=item.style_tags or [],
    )

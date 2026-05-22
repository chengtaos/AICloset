from typing import Optional
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    ClothingItemCreate,
    ClothingItemUpdate,
    ClothingItemResponse,
    WardrobeStats,
    WearRecordCreate,
    WearRecordResponse,
)
from app.services.wardrobe import (
    list_items,
    get_item,
    create_item,
    update_item,
    delete_item,
    add_image,
    get_stats,
    record_wear,
    get_wear_history,
)
from app.agent.vision import classify_image
from app.agent.segmentation import segment_image

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


@router.get("/items", response_model=list[ClothingItemResponse])
def api_list_items(
    category: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_items(db, user_id=current_user.id, category=category, season=season, style=style, search=search, sort=sort)


@router.get("/items/{item_id}", response_model=ClothingItemResponse)
def api_get_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = get_item(db, item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")
    return item


@router.post("/items", response_model=ClothingItemResponse, status_code=201)
def api_create_item(data: ClothingItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_item(db, data, user_id=current_user.id)


@router.put("/items/{item_id}", response_model=ClothingItemResponse)
def api_update_item(item_id: int, data: ClothingItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = update_item(db, item_id, data, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")
    return item


@router.delete("/items/{item_id}", status_code=204)
def api_delete_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ok = delete_item(db, item_id, user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="衣物不存在")


@router.post("/items/{item_id}/images", response_model=ClothingItemResponse)
async def api_upload_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = get_item(db, item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    filepath.write_bytes(content)

    # 服饰分割：抠出主体，透明背景；失败则用原图
    seg_path = segment_image(str(filepath))
    path_str = seg_path if seg_path else f"uploads/{filename}"
    item = add_image(db, item_id, path_str, user_id=current_user.id)
    return item


@router.post("/auto-classify")
async def api_auto_classify(file: UploadFile = File(...)):
    """拍照识别衣物：上传图片 → AI 返回所有衣物分类结果 → 服饰分割抠图。"""
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"classify_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    filepath.write_bytes(content)

    results = classify_image(str(filepath))
    if results is None:
        raise HTTPException(status_code=422, detail="AI 识别失败，请确认图片清晰且包含衣物")

    # 服饰分割抠图，失败时降级到原图
    seg_path = segment_image(str(filepath))
    base_image = seg_path if seg_path else f"uploads/{filename}"

    for item in results:
        item["image_path"] = base_image

    return {"items": results}


@router.get("/stats", response_model=WardrobeStats)
def api_get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_stats(db, user_id=current_user.id)


# ── 穿着记录 ──

@router.post("/wear-records", response_model=WearRecordResponse, status_code=201)
def api_record_wear(data: WearRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return record_wear(
        db,
        user_id=current_user.id,
        outfit_id=data.outfit_id,
        item_ids=data.item_ids,
        wear_date=data.wear_date,
        note=data.note,
    )


@router.get("/wear-records", response_model=list[WearRecordResponse])
def api_get_wear_history(
    year: int = Query(0),
    month: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_wear_history(db, user_id=current_user.id, year=year, month=month)

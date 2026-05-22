from typing import Optional
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
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

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


@router.get("/items", response_model=list[ClothingItemResponse])
def api_list_items(
    category: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return list_items(db, category=category, season=season, style=style, search=search)


@router.get("/items/{item_id}", response_model=ClothingItemResponse)
def api_get_item(item_id: int, db: Session = Depends(get_db)):
    item = get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")
    return item


@router.post("/items", response_model=ClothingItemResponse, status_code=201)
def api_create_item(data: ClothingItemCreate, db: Session = Depends(get_db)):
    return create_item(db, data)


@router.put("/items/{item_id}", response_model=ClothingItemResponse)
def api_update_item(item_id: int, data: ClothingItemUpdate, db: Session = Depends(get_db)):
    item = update_item(db, item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")
    return item


@router.delete("/items/{item_id}", status_code=204)
def api_delete_item(item_id: int, db: Session = Depends(get_db)):
    ok = delete_item(db, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="衣物不存在")


@router.post("/items/{item_id}/images", response_model=ClothingItemResponse)
async def api_upload_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    item = get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="衣物不存在")

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    filepath.write_bytes(content)

    # 简单的图片压缩（Pillow 可选，这里保持原样用于 MVP）
    path_str = f"uploads/{filename}"
    item = add_image(db, item_id, path_str)
    return item


@router.get("/stats", response_model=WardrobeStats)
def api_get_stats(db: Session = Depends(get_db)):
    return get_stats(db)


# ── 穿着记录 ──

@router.post("/wear-records", response_model=WearRecordResponse, status_code=201)
def api_record_wear(data: WearRecordCreate, db: Session = Depends(get_db)):
    return record_wear(
        db,
        user_id=1,
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
):
    return get_wear_history(db, year=year, month=month)

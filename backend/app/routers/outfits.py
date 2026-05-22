from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Outfit, User
from app.schemas import OutfitCreate, OutfitResponse

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.post("", response_model=OutfitResponse, status_code=201)
def api_create_outfit(
    data: OutfitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    outfit = Outfit(
        user_id=current_user.id,
        name=data.name,
        items=[it.model_dump() for it in data.items],
        tags=data.tags,
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return outfit


@router.get("", response_model=list[OutfitResponse])
def api_list_outfits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Outfit)
        .filter(Outfit.user_id == current_user.id)
        .order_by(Outfit.created_at.desc())
        .all()
    )


@router.get("/{outfit_id}", response_model=OutfitResponse)
def api_get_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    outfit = (
        db.query(Outfit)
        .filter(Outfit.id == outfit_id, Outfit.user_id == current_user.id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=404, detail="搭配不存在")
    return outfit


@router.delete("/{outfit_id}", status_code=204)
def api_delete_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    outfit = (
        db.query(Outfit)
        .filter(Outfit.id == outfit_id, Outfit.user_id == current_user.id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=404, detail="搭配不存在")
    db.delete(outfit)
    db.commit()

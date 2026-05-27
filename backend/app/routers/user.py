"""用户设置路由：自备 API Key 管理。"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.crypto import encrypt, decrypt
from app.database import get_db
from app.models import User, UserProfile

router = APIRouter(prefix="/api/user", tags=["user"])


class ApiKeysRequest(BaseModel):
    deepseek: str = ""
    amap: str = ""
    dashscope: str = ""
    alibaba_access_key_id: str = ""
    alibaba_access_key_secret: str = ""


class ApiKeysResponse(BaseModel):
    deepseek: str   # 脱敏显示：前缀 + ****
    amap: str
    dashscope: str
    alibaba_access_key_id: str
    alibaba_access_key_secret: str


# 从 UserProfile 读取解密后的 Key（供 Agent 模块使用）
def get_user_api_keys(db: Session, user_id: int) -> dict[str, str]:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile or not profile.user_api_keys:
        return {}
    encrypted = profile.user_api_keys or {}
    return {k: decrypt(v) for k, v in encrypted.items() if v}


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


@router.get("/keys", response_model=ApiKeysResponse)
def get_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = get_user_api_keys(db, current_user.id)
    return ApiKeysResponse(
        deepseek=_mask_key(raw.get("deepseek", "")),
        amap=_mask_key(raw.get("amap", "")),
        dashscope=_mask_key(raw.get("dashscope", "")),
        alibaba_access_key_id=_mask_key(raw.get("alibaba_access_key_id", "")),
        alibaba_access_key_secret=_mask_key(raw.get("alibaba_access_key_secret", "")),
    )


@router.put("/keys", response_model=ApiKeysResponse)
def update_keys(
    req: ApiKeysRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    new_keys = {
        k: encrypt(v)
        for k, v in {
            "deepseek": req.deepseek,
            "amap": req.amap,
            "dashscope": req.dashscope,
            "alibaba_access_key_id": req.alibaba_access_key_id,
            "alibaba_access_key_secret": req.alibaba_access_key_secret,
        }.items()
        if v  # 仅保存有值的 Key，空值保留已有（允许只更新部分 key）
    }
    merged = (profile.user_api_keys or {}) | new_keys
    profile.user_api_keys = merged
    db.commit()

    return get_keys(db=db, current_user=current_user)

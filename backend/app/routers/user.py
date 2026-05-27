"""用户设置路由：自备 API Key 管理 + 个人资料编辑。"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, verify_password, hash_password
from app.crypto import encrypt, decrypt
from app.database import get_db
from app.models import User, UserProfile
from app.schemas import ProfileUpdate, PasswordChange, ProfileResponse
from app.upload import validate_image, validate_image_size

router = APIRouter(prefix="/api/user", tags=["user"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


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


# ── 个人资料 ──

@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.nickname is not None:
        current_user.nickname = req.nickname.strip()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/password")
def change_password(
    req: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码不正确")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少6位")
    current_user.password_hash = hash_password(req.new_password)
    current_user.token_version += 1  # 使所有旧 token 失效
    db.commit()
    return {"status": "ok"}


@router.post("/avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await validate_image(file)

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"avatar_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    validate_image_size(content)
    filepath.write_bytes(content)

    current_user.avatar = f"uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

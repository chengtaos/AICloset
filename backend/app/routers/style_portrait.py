"""风格画像生成路由：根据穿衣风格人格生成动漫人物画像。"""

import hashlib
import uuid
from pathlib import Path
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserProfile
from app.routers.user import get_user_api_keys
from app.agent.image_gen import generate_style_portrait

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


class StylePortraitRequest(BaseModel):
    profile_hash: str = ""  # 前端计算的 4 维度 hash
    archetype_name: str
    archetype_desc: str
    top_colors: list[str] = []
    top_tags: list[str] = []
    style_trend: int = 50
    color_bold: int = 50
    complexity: int = 50
    expression: int = 50


class StylePortraitResponse(BaseModel):
    image_url: str
    profile_hash: str
    generated: bool  # true = 新生成, false = 来自缓存


def _compute_hash(req: StylePortraitRequest) -> str:
    raw = f"{req.style_trend}|{req.color_bold}|{req.complexity}|{req.expression}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


@router.post("/style-portrait", response_model=StylePortraitResponse)
async def generate_portrait(
    req: StylePortraitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    current_hash = _compute_hash(req)

    # 缓存命中：hash 相同且图片文件存在
    if (
        profile.style_portrait_hash
        and profile.style_portrait_hash == current_hash
        and profile.style_portrait_image
    ):
        image_path = UPLOAD_DIR / profile.style_portrait_image
        if image_path.exists():
            return StylePortraitResponse(
                image_url=f"/{profile.style_portrait_image}",
                profile_hash=current_hash,
                generated=False,
            )

    # 需要生成：获取 API Key 并调用
    keys = get_user_api_keys(db, current_user.id)
    dashscope_key = keys.get("dashscope", "")

    if not dashscope_key:
        raise HTTPException(
            status_code=400,
            detail="请先在「API 密钥」中配置 DashScope API Key",
        )

    image_bytes = await generate_style_portrait(
        archetype_name=req.archetype_name,
        archetype_desc=req.archetype_desc,
        top_colors=req.top_colors,
        top_tags=req.top_tags,
        style_trend=req.style_trend,
        color_bold=req.color_bold,
        complexity=req.complexity,
        expression=req.expression,
        api_key=dashscope_key,
    )

    if image_bytes is None:
        raise HTTPException(status_code=422, detail="画像生成失败，请稍后重试")

    # 保存图片
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"style_portrait_{current_user.id}_{uuid.uuid4().hex[:8]}.png"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(image_bytes)

    # 删除旧图片
    if profile.style_portrait_image:
        old_path = UPLOAD_DIR / profile.style_portrait_image
        try:
            old_path.unlink(missing_ok=True)
        except Exception:
            pass

    # 更新 profile
    profile.style_portrait_hash = current_hash
    profile.style_portrait_image = f"uploads/{filename}"
    db.commit()

    return StylePortraitResponse(
        image_url=f"/uploads/{filename}",
        profile_hash=current_hash,
        generated=True,
    )

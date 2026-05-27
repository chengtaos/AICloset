"""JWT 鉴权模块：access token（15分钟）+ refresh token（7天 httpOnly cookie）+ token_version 撤销。"""

import os
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET 环境变量未设置，请在生产环境中配置")
JWT_ALGORITHM = "HS256"

ACCESS_EXPIRE_MINUTES = 15
REFRESH_EXPIRE_DAYS = 7
REFRESH_COOKIE_NAME = "refresh_token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ── token 签发 ──

def create_access_token(user: User) -> str:
    expire = datetime.now() + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user: User) -> str:
    expire = datetime.now() + timedelta(days=REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # 生产环境需 nginx 反代时处理 HTTPS
        max_age=REFRESH_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth")


# ── token 验证 ──

def _decode_token(token: str, expected_type: str) -> dict:
    """解码 JWT，校验类型和版本。"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except Exception:
        raise HTTPException(status_code=401, detail="无效的登录凭证")

    if payload.get("type") != expected_type:
        raise HTTPException(status_code=401, detail="token 类型不匹配")
    return payload


def _get_user(payload: dict, db: Session) -> User:
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    if user.token_version != payload.get("ver"):
        raise HTTPException(status_code=401, detail="密码已更改，请重新登录")
    return user


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = _decode_token(token, "access")
    return _get_user(payload, db)


def get_current_user_via_refresh(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """从 httpOnly cookie 中的 refresh token 获取用户，用于 /refresh 端点。"""
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = _decode_token(token, "refresh")
    return _get_user(payload, db)

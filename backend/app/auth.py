"""JWT 鉴权模块：token 签发、验证、get_current_user 依赖。"""

import os
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

JWT_SECRET = os.getenv("JWT_SECRET", "aicloset-dev-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_token(user_id: int) -> str:
    expire = datetime.now() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except Exception:
        raise HTTPException(status_code=401, detail="无效的登录凭证")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User | None:
    """可选鉴权：有 token 则解析，无 token 返回 None。用于兼容过渡期。"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

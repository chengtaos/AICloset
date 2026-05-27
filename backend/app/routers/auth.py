from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_refresh_token,
    set_refresh_cookie,
    clear_refresh_cookie,
    get_current_user,
    get_current_user_via_refresh,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.limiter import limiter
from app.models import User
from config import RATE_LIMIT_AUTH

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)
    nickname: str = ""


class LoginRequest(BaseModel):
    phone: str
    password: str


class UserResponse(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def _auth_response(user: User, response: Response) -> AuthResponse:
    """签发双 token：access token 放 body，refresh token 放 httpOnly cookie。"""
    access = create_access_token(user)
    refresh = create_refresh_token(user)
    set_refresh_cookie(response, refresh)
    return AuthResponse(token=access, user=UserResponse.model_validate(user))


@router.post("/register", response_model=AuthResponse)
@limiter.limit(RATE_LIMIT_AUTH)
def api_register(
    request: Request,
    req: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.phone == req.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="该手机号已注册")

    user = User(
        phone=req.phone,
        nickname=req.nickname or f"用户{req.phone[-4:]}",
        password_hash=hash_password(req.password),
        token_version=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user, response)


@router.post("/login", response_model=AuthResponse)
@limiter.limit(RATE_LIMIT_AUTH)
def api_login(
    request: Request,
    req: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="手机号或密码错误")
    return _auth_response(user, response)


@router.get("/me", response_model=UserResponse)
def api_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("30/minute")
def api_refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """用 httpOnly cookie 中的 refresh token 换取新的 access token。刷新后旧 cookie 不失效。"""
    user = get_current_user_via_refresh(request, db)
    return _auth_response(user, response)


@router.post("/logout")
def api_logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """登出：清除 refresh cookie + 递增 token_version 使所有 token 失效。"""
    user = db.query(User).filter(User.id == current_user.id).first()
    if user:
        user.token_version += 1
        db.commit()
    clear_refresh_cookie(response)
    return {"status": "ok"}

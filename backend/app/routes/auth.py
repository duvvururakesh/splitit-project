from datetime import datetime, timedelta
from typing import Dict, List

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.token_service import generate_refresh_token, get_refresh_expiry, hash_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"

# Lightweight in-memory limiter for immediate protection.
# NOTE: per-process only; replace with Redis-based limiter for multi-instance production.
_RATE_LIMIT_BUCKETS: Dict[str, List[float]] = {}


def _check_rate_limit(request: Request, key: str, limit: int, window_seconds: int) -> None:
    import time

    now = time.time()
    ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{ip}"
    timestamps = _RATE_LIMIT_BUCKETS.get(bucket_key, [])
    cutoff = now - window_seconds
    timestamps = [ts for ts in timestamps if ts >= cutoff]
    if len(timestamps) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    timestamps.append(now)
    _RATE_LIMIT_BUCKETS[bucket_key] = timestamps


def _set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=True,
        samesite="lax",
    )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")


@router.post("/guest", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def guest_login(db: Session = Depends(get_db)):
    """Create a throwaway guest user and return a short-lived JWT."""
    import uuid as _uuid

    user = User(
        email=f"guest_{_uuid.uuid4()}@guest.local",
        display_name="Guest",
        is_guest=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        phone_number=body.phone_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    _check_rate_limit(request, key="login", limit=10, window_seconds=60)

    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Phase 1: create a refresh-backed session while keeping existing access token response unchanged.
    raw_refresh_token, refresh_token_hash = generate_refresh_token()
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=get_refresh_expiry(settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()

    _set_refresh_cookie(response, raw_refresh_token)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, db: Session = Depends(get_db)):
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    token_hash = hash_refresh_token(raw_refresh_token)
    session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if session.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Refresh token revoked")
    if session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not available")

    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/logout", status_code=200)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh_token:
        token_hash = hash_refresh_token(raw_refresh_token)
        session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.utcnow()
            db.commit()

    _clear_refresh_cookie(response)
    return {"message": "Logged out"}


@router.post("/logout-all", status_code=200)
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(AuthSession).filter(
        AuthSession.user_id == current_user.id,
        AuthSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()
    _clear_refresh_cookie(response)
    return {"message": "Logged out from all sessions"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


class UpdateMeRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.display_name is not None:
        if not body.display_name.strip():
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        current_user.display_name = body.display_name.strip()

    if body.email is not None:
        if body.email != current_user.email:
            existing = db.query(User).filter(User.email == body.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            current_user.email = body.email

    if body.new_password is not None:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not current_user.password_hash or not verify_password(body.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(body.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        current_user.password_hash = hash_password(body.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


# ─── Password Reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=200)
def forgot_password(body: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(request, key="forgot-password", limit=5, window_seconds=60)

    import secrets

    user = db.query(User).filter(User.email == body.email).first()
    # Always return success even if email not found (prevents user enumeration)
    if not user or user.is_guest:
        return {"message": "If that email exists, a reset link has been sent."}

    raw_token = secrets.token_urlsafe(32)
    user.password_reset_token = hash_refresh_token(raw_token)
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    # TODO: send raw_token by email provider integration.
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=200)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    token_hash = hash_refresh_token(body.token)
    user = db.query(User).filter(User.password_reset_token == token_hash).first()
    if not user or not user.password_reset_expires or user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")

    user.password_hash = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password updated successfully"}

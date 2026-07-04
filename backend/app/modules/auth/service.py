# The service layer contains business logic. The router calls the service. The service calls the DB. Nothing else calls the DB directly.

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.modules.auth.models import RefreshToken, User
from app.modules.auth.schemas import LoginRequest, RegisterRequest

settings = get_settings()


async def register_user(data: RegisterRequest, db: AsyncSession) -> tuple[User, str, str]:
    # Check username taken
    existing = await db.scalar(select(User).where(User.username == data.username))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

    # Check email taken
    existing = await db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()  # flush assigns the UUID without committing — we need the ID below

    access_token = create_access_token(user.id, user.username, user.role)
    refresh_token = await _create_refresh_token(user.id, db)

    return user, access_token, refresh_token


async def login_user(data: LoginRequest, db: AsyncSession) -> tuple[User, str, str]:
    user = await db.scalar(select(User).where(User.email == data.email))

    # Always run verify_password even if user doesn't exist
    # This prevents timing attacks that reveal whether an email is registered
    dummy_hash = "$2b$12$K8GpNMDDaB7IZfSDSKpEEuVFMwCpPHCTfVXIzmSaGXrBMXMBnVLYa"    
    password_ok = verify_password(data.password, user.hashed_password if user else dummy_hash)

    if not user or not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is suspended")

    # Update last login time
    user.last_login_at = datetime.now(timezone.utc)

    access_token = create_access_token(user.id, user.username, user.role)
    refresh_token = await _create_refresh_token(user.id, db)

    return user, access_token, refresh_token


async def refresh_tokens(raw_token: str, db: AsyncSession) -> tuple[str, str]:
    token_hash = hash_refresh_token(raw_token)

    record = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )

    if not record or record.revoked_at or record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    # Revoke the old token immediately (rotation)
    record.revoked_at = datetime.now(timezone.utc)

    # Issue new tokens
    user = await db.get(User, record.user_id)
    access_token = create_access_token(user.id, user.username, user.role)
    new_refresh_token = await _create_refresh_token(user.id, db)

    return access_token, new_refresh_token


async def logout_user(raw_token: str, db: AsyncSession) -> None:
    token_hash = hash_refresh_token(raw_token)
    record = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if record:
        record.revoked_at = datetime.now(timezone.utc)


# ── Internal helper ────────────────────────────────────────────────

async def _create_refresh_token(user_id: uuid.UUID, db: AsyncSession) -> str:
    raw = generate_refresh_token()
    record = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(record)
    return raw   # return raw token to send to client — we never store this

# Notice the timing attack prevention in login_user. If you return early when the user doesn't exist (before running verify_password), an attacker can measure the response time — fast response = email not registered, slow response = email registered but wrong password. Running bcrypt regardless makes both paths take the same time.
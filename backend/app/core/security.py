import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt 
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()

# ── Password ───────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8"),
    )

# ── Access Token (JWT) ─────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID, username: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "sub": str(user_id),       # subject — always the user's ID
        "username": username,
        "role": role,
        "iat": now,                # issued at
        "exp": expire,             # expiry — jose validates this automatically
        "jti": str(uuid.uuid4()),  # unique token ID (for future denylist use)
    }

    return jwt.encode(payload, settings.app_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """
    Returns the payload dict or raises JWTError.
    Caller is responsible for handling JWTError.
    """
    return jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])

# ── Refresh Token ──────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """Generates a cryptographically secure opaque token."""
    return str(uuid.uuid4()) + str(uuid.uuid4())  # 72 char random string

def hash_refresh_token(token: str) -> str:
    """We store the hash, not the raw token — same principle as passwords."""
    return hashlib.sha256(token.encode()).hexdigest()

# All JWT and password logic lives here — completely separate from web concerns. This module has zero FastAPI imports, which means you can test it with plain pytest, no HTTP client needed.
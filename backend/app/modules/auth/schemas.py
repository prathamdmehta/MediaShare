import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
import re


# ── Requests (what the client sends) ──────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr          # Pydantic validates email format automatically
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.lower().strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3–30 characters")
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError("Username can only contain letters, numbers, underscores")
        return v

    # @field_validator("password")
    # @classmethod
    # def password_strong(cls, v: str) -> str:
    #     if len(v) < 8:
    #         raise ValueError("Password must be at least 8 characters")
    #     return v
    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 32:
            raise ValueError("Password must be 32 characters or less")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    # We'll also accept via cookie, but allow body for API clients
    refresh_token: str | None = None


# ── Responses (what the API sends back) ───────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}  # allows .model_validate(orm_object)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int          # seconds until access token expires


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# Pydantic schemas are separate from SQLAlchemy models. The model talks to the DB. The schema validates what comes in and out of the API. They intentionally never share a class.
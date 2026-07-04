import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
import re


# ── Requests ───────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    is_private: bool | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 60:
            raise ValueError("Display name must be 60 characters or less")
        return v

    @field_validator("bio")
    @classmethod
    def bio_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 500:
            raise ValueError("Bio must be 500 characters or less")
        return v


# ── Responses ──────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str | None
    bio: str | None
    avatar_url: str | None       # generated at request time, not stored
    storage_used_bytes: int
    storage_quota_bytes: int
    is_private: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicUserResponse(BaseModel):
    """What other users see when they view a profile — limited fields."""
    username: str
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    is_private: bool

    model_config = {"from_attributes": True}


class UserSearchResult(BaseModel):
    """Compact result for search listings."""
    username: str
    display_name: str | None
    avatar_url: str | None

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    results: list[UserSearchResult]
    next_cursor: str | None      # None means no more pages
    total_count: int
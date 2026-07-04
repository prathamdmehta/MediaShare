# app/modules/shares/schemas.py

import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


# ── Requests ───────────────────────────────────────────────────────

class SendShareRequest(BaseModel):
    media_file_ids: list[uuid.UUID]
    recipient_usernames: list[str]
    message: str | None = None

    @field_validator("media_file_ids")
    @classmethod
    def validate_file_count(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("Must include at least one file")
        if len(v) > 20:
            raise ValueError("Cannot share more than 20 files at once")
        return v

    @field_validator("recipient_usernames")
    @classmethod
    def validate_recipients(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("Must have at least one recipient")
        if len(v) > 5:
            raise ValueError("Cannot send to more than 5 recipients at once")
        return v


# ── Responses ──────────────────────────────────────────────────────

class ShareFileResponse(BaseModel):
    """One file inside an expanded cluster view."""
    id: uuid.UUID
    original_name: str
    file_type: str
    mime_type: str
    size_bytes: int
    position: int
    download_url: str        # presigned GET URL, 2 min TTL
    thumbnail_url: str | None
    duration_secs: int | None

    model_config = {"from_attributes": True}


class InboxItemResponse(BaseModel):
    """
    One cluster as it appears in the inbox.
    Collapsed view — no individual file details yet.
    """
    share_recipient_id: uuid.UUID
    cluster_id: uuid.UUID
    sender_username: str
    sender_display_name: str | None
    share_type: str
    file_count: int
    total_size_bytes: int
    message: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SentItemResponse(BaseModel):
    """One cluster in the sender's sent view."""
    cluster_id: uuid.UUID
    share_type: str
    file_count: int
    total_size_bytes: int
    message: str | None
    recipient_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ClusterDetailResponse(BaseModel):
    """Expanded cluster — all files with download URLs."""
    cluster_id: uuid.UUID
    sender_username: str
    share_type: str
    message: str | None
    file_count: int
    total_size_bytes: int
    files: list[ShareFileResponse]
    is_partially_unavailable: bool = False
    created_at: datetime


class SendShareResponse(BaseModel):
    cluster_id: uuid.UUID
    recipient_count: int
    file_count: int
    message: str = "Share sent successfully"


class InboxResponse(BaseModel):
    items: list[InboxItemResponse]
    next_cursor: str | None
    total_count: int


class SentResponse(BaseModel):
    items: list[SentItemResponse]
    next_cursor: str | None
    total_count: int
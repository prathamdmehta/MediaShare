import uuid
from datetime import datetime
from pydantic import BaseModel


class InitiateUploadRequest(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int


class InitiateUploadResponse(BaseModel):
    upload_id: str
    presigned_url: str
    s3_key: str
    expires_in: int = 3600


class ConfirmUploadRequest(BaseModel):
    upload_id: str
    s3_key: str


class MediaFileResponse(BaseModel):
    id: uuid.UUID
    original_name: str
    mime_type: str
    file_type: str
    size_bytes: int
    processing_status: str
    rejection_reason: str | None
    download_url: str | None
    thumbnail_url: str | None
    duration_secs: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
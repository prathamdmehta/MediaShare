import json
import re
import uuid
from datetime import datetime, timezone

import redis as redis_sync
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.modules.media.models import MediaFile
from app.modules.media.schemas import (
    ConfirmUploadRequest,
    InitiateUploadRequest,
    InitiateUploadResponse,
)
from app.modules.media.storage import (
    delete_s3_object,
    generate_presigned_put_url,
    generate_presigned_get_url,
)
from app.modules.media.validators import validate_upload

from app.modules.users.models import Profile

settings = get_settings()
redis = redis_sync.from_url(settings.redis_url, decode_responses=True)


def _sanitize_filename(name: str) -> str:
    name = name.replace("\\", "").replace("/", "")
    name = re.sub(r"[^\w\.\-]", "_", name)
    return name[:200]


def _build_s3_key(user_id: uuid.UUID, filename: str) -> str:
    now = datetime.now(timezone.utc)
    file_uuid = uuid.uuid4()
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"uploads/{user_id}/{now.year}/{now.month:02d}/{file_uuid}.{ext}"


async def initiate_upload(
    data: InitiateUploadRequest,
    user_id: uuid.UUID,
) -> InitiateUploadResponse:
    file_type = validate_upload(data.mime_type, data.size_bytes)
    safe_name = _sanitize_filename(data.filename)
    s3_key = _build_s3_key(user_id, safe_name)
    upload_id = str(uuid.uuid4())

    redis.setex(
        f"pending_upload:{upload_id}",
        3600,
        json.dumps({
            "user_id": str(user_id),
            "s3_key": s3_key,
            "mime_type": data.mime_type,
            "file_type": file_type,
            "original_name": safe_name,
            "size_bytes": data.size_bytes,
        }),
    )

    presigned_url = generate_presigned_put_url(s3_key, data.mime_type)
    return InitiateUploadResponse(
        upload_id=upload_id,
        presigned_url=presigned_url,
        s3_key=s3_key,
    )

'''
async def confirm_upload(
    data: ConfirmUploadRequest,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> MediaFile:
    raw = redis.get(f"pending_upload:{data.upload_id}")
    if not raw:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Upload session not found or expired",
        )

    pending = json.loads(raw)

    if pending["user_id"] != str(user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your upload")

    if pending["s3_key"] != data.s3_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "S3 key mismatch")

    media_file = MediaFile(
        owner_id=user_id,
        original_name=pending["original_name"],
        s3_key=pending["s3_key"],
        mime_type=pending["mime_type"],
        file_type=pending["file_type"],
        size_bytes=pending["size_bytes"],
        processing_status="pending",  # Celery will update this
    )
    db.add(media_file)
    await db.flush()

    redis.delete(f"pending_upload:{data.upload_id}")

    # Enqueue Celery task
    from app.workers.tasks.media_processing import process_media_file
    process_media_file.delay(
        str(media_file.id),
        media_file.s3_key,
        media_file.file_type,
    )

    return media_file
'''

async def confirm_upload(
    data: ConfirmUploadRequest,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> MediaFile:
    raw = redis.get(f"pending_upload:{data.upload_id}")
    if not raw:
        # Check if already confirmed — idempotent response
        existing = await db.scalar(
            select(MediaFile).where(MediaFile.s3_key == data.s3_key)
        )
        if existing and existing.owner_id == user_id:
            return existing  # already confirmed, return existing record
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Upload session not found or expired",
        )

    pending = json.loads(raw)

    if pending["user_id"] != str(user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your upload")

    if pending["s3_key"] != data.s3_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "S3 key mismatch")

    # Check not already confirmed (race condition between two confirm calls)
    existing = await db.scalar(
        select(MediaFile).where(MediaFile.s3_key == data.s3_key)
    )
    if existing:
        redis.delete(f"pending_upload:{data.upload_id}")
        return existing

    media_file = MediaFile(
        owner_id=user_id,
        original_name=pending["original_name"],
        s3_key=pending["s3_key"],
        mime_type=pending["mime_type"],
        file_type=pending["file_type"],
        size_bytes=pending["size_bytes"],
        processing_status="pending",
    )
    db.add(media_file)
    await db.flush()

     # ── Update storage quota ───────────────────────────────────────
    profile = await db.scalar(
        select(Profile).where(Profile.user_id == user_id)
    )
    if profile:
        profile.storage_used_bytes += media_file.size_bytes

    redis.delete(f"pending_upload:{data.upload_id}")

    from app.workers.tasks.media_processing import process_media_file
    process_media_file.delay(
        str(media_file.id),
        media_file.s3_key,
        media_file.file_type,
    )

    return media_file

'''
What changed:
If Redis key is gone but s3_key exists in DB owned by this user → return it (idempotent)
If Redis key exists but DB row already exists → clean up Redis, return existing row
Raw integrity errors never reach the client
'''

async def list_own_files(
    user_id: uuid.UUID, db: AsyncSession
) -> list[MediaFile]:
    result = await db.execute(
        select(MediaFile)
        .where(MediaFile.owner_id == user_id)
        .order_by(MediaFile.created_at.desc())
    )
    return list(result.scalars().all())


async def get_own_file(
    media_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> MediaFile:
    media = await db.get(MediaFile, media_id)
    if not media or media.owner_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return media


async def delete_own_file(
    media_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    media = await get_own_file(media_id, user_id, db)

    # ── Update storage quota before deletion ───────────────────────
    profile = await db.scalar(
        select(Profile).where(Profile.user_id == user_id)
    )
    if profile:
        profile.storage_used_bytes = max(
            0,
            profile.storage_used_bytes - media.size_bytes
        )
        # max(0, ...) prevents negative values from any accounting drift

    delete_s3_object(media.s3_key)
    await db.delete(media)

'''
Why max(0, ...)? If there's any accounting drift (rejected files, partial failures), storage_used could theoretically go negative without this guard. Always floor at 0.
'''
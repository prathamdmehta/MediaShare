from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.users import schemas, service
from app.modules.shares.service import block_user, unblock_user
from app.modules.users.service import get_blocked_users

import uuid
import io
from fastapi import UploadFile, File, HTTPException, status

router = APIRouter()


@router.get("/me/profile", response_model=schemas.ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await service.get_own_profile(current_user.id, db)
    return _build_profile_response(profile)


@router.patch("/me/profile", response_model=schemas.ProfileResponse)
async def update_my_profile(
    data: schemas.UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await service.update_profile(current_user.id, data, db)
    return _build_profile_response(profile)


@router.get("/{username}", response_model=schemas.PublicUserResponse)
async def get_user_profile(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, profile = await service.get_public_profile(username, db)
    return schemas.PublicUserResponse(
        username=user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=_get_avatar_url(profile.avatar_s3_key),
        is_private=profile.is_private,
    )


# ── Helper ─────────────────────────────────────────────────────────

def _build_profile_response(profile) -> schemas.ProfileResponse:
    return schemas.ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=_get_avatar_url(profile.avatar_s3_key),
        storage_used_bytes=profile.storage_used_bytes,
        storage_quota_bytes=profile.storage_quota_bytes,
        is_private=profile.is_private,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _get_avatar_url(s3_key: str | None) -> str | None:
    """Convert S3 key to URL. For now returns None — Phase 3 adds real S3 presigned URLs."""
    if not s3_key:
        return None
    # Placeholder — replaced with real presigned URL generation in Phase 3
    return f"http://localhost:4566/mediashare-dev/{s3_key}"

@router.post("/{username}/block", status_code=204)
async def block(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await block_user(current_user.id, username, db)


@router.delete("/{username}/block", status_code=204)
async def unblock(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await unblock_user(current_user.id, username, db)

@router.get("/me/blocked")
async def get_my_blocked_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    users = await get_blocked_users(current_user.id, db)
    return [
        {
            "username": u.username,
            "display_name": None,
            "avatar_url": None,
        }
        for u in users
    ]

# Add these imports at the top

# Add this endpoint
@router.post("/me/avatar", status_code=200)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Avatar must be JPEG, PNG or WebP"
        )

    # Read file bytes
    contents = await file.read()

    # Limit to 5MB
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "Avatar must be under 5MB"
        )

    from app.modules.media.storage import get_s3_client, get_presign_client
    from app.config import get_settings
    settings = get_settings()

    ext = file.content_type.split("/")[-1]
    s3_key = f"avatars/{current_user.id}/avatar.{ext}"

    # Upload directly to S3 (small file — passes through API)
    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.s3_bucket_name,
        Key=s3_key,
        Body=contents,
        ContentType=file.content_type,
    )

    # Generate avatar URL using presign client (localhost for dev)
    presign = get_presign_client()
    avatar_url = presign.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": s3_key},
        ExpiresIn=86400,  # 24 hours
    )

    # Save s3_key to profile
    from sqlalchemy import select
    from app.modules.users.models import Profile
    profile = await db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    profile.avatar_s3_key = s3_key
    await db.flush()

    return {"avatar_url": avatar_url, "s3_key": s3_key}
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.users import schemas, service
from app.modules.shares.service import block_user, unblock_user
from app.modules.users.service import get_blocked_users

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
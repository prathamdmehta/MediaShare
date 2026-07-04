import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.media import schemas, service
from app.modules.media.storage import generate_presigned_get_url

router = APIRouter()


@router.post("/initiate", response_model=schemas.InitiateUploadResponse)
async def initiate_upload(
    data: schemas.InitiateUploadRequest,
    current_user: User = Depends(get_current_user),
):
    return await service.initiate_upload(data, current_user.id)


@router.post("/confirm", response_model=schemas.MediaFileResponse, status_code=201)
async def confirm_upload(
    data: schemas.ConfirmUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    media = await service.confirm_upload(data, current_user.id, db)
    return _build_response(media)


@router.get("/", response_model=list[schemas.MediaFileResponse])
async def list_my_files(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    files = await service.list_own_files(current_user.id, db)
    return [_build_response(f) for f in files]


@router.get("/{media_id}", response_model=schemas.MediaFileResponse)
async def get_file(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    media = await service.get_own_file(media_id, current_user.id, db)
    return _build_response(media)


@router.delete("/{media_id}", status_code=204)
async def delete_file(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_own_file(media_id, current_user.id, db)


def _build_response(media) -> schemas.MediaFileResponse:
    return schemas.MediaFileResponse(
        id=media.id,
        original_name=media.original_name,
        mime_type=media.mime_type,
        file_type=media.file_type,
        size_bytes=media.size_bytes,
        processing_status=media.processing_status,
        rejection_reason=media.rejection_reason,
        download_url=generate_presigned_get_url(media.s3_key),
        thumbnail_url=(
            generate_presigned_get_url(media.thumbnail_s3_key)
            if media.thumbnail_s3_key else None
        ),
        duration_secs=media.duration_secs,
        created_at=media.created_at,
    )
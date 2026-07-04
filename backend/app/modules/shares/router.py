# app/modules/shares/router.py

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.shares import schemas, service

router = APIRouter()


@router.post("/send", response_model=schemas.SendShareResponse, status_code=201)
async def send_share(
    data: schemas.SendShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cluster = await service.send_share(data, current_user, db)
    return schemas.SendShareResponse(
        cluster_id=cluster.id,
        recipient_count=len(data.recipient_usernames),
        file_count=cluster.file_count,
    )


@router.get("/inbox", response_model=schemas.InboxResponse)
async def get_inbox(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor, total = await service.get_inbox(
        current_user.id, cursor, limit, db
    )
    return schemas.InboxResponse(
        items=items, next_cursor=next_cursor, total_count=total
    )


@router.get("/sent", response_model=schemas.SentResponse)
async def get_sent(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor, total = await service.get_sent(
        current_user.id, cursor, limit, db
    )
    return schemas.SentResponse(
        items=items, next_cursor=next_cursor, total_count=total
    )


@router.get("/{cluster_id}", response_model=schemas.ClusterDetailResponse)
async def get_cluster_detail(
    cluster_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_cluster_detail(
        cluster_id, current_user.id, db
    )


@router.patch("/{share_recipient_id}/read", status_code=204)
async def mark_read(
    share_recipient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_read(share_recipient_id, current_user.id, db)


@router.delete("/{share_recipient_id}", status_code=204)
async def delete_from_inbox(
    share_recipient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_from_inbox(share_recipient_id, current_user.id, db)
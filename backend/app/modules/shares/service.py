# app/modules/shares/service.py

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import create_notification

from app.modules.auth.models import User
from app.modules.media.models import MediaFile
from app.modules.media.storage import generate_presigned_get_url
from app.modules.media.validators import (
    MEDIA_MIME_TYPES, DOCUMENT_MIME_TYPES
)
from app.modules.shares.models import (
    BlockedUser, ShareCluster,
    ShareClusterFile, ShareClusterRecipient,
)
from app.modules.shares.schemas import (
    SendShareRequest, ClusterDetailResponse,
    ShareFileResponse, InboxItemResponse,
    SentItemResponse,
)

# 2 minute presigned URL TTL — short enough that post-block
# exposure window is minimal
PRESIGNED_URL_TTL = 120


async def is_blocked(
    user_a: uuid.UUID,
    user_b: uuid.UUID,
    db: AsyncSession,
) -> bool:
    """
    Returns True if either user has blocked the other.
    Bidirectional check — A blocks B OR B blocks A.
    """
    result = await db.scalar(
        select(exists().where(
            or_(
                and_(
                    BlockedUser.blocker_id == user_a,
                    BlockedUser.blocked_id == user_b,
                ),
                and_(
                    BlockedUser.blocker_id == user_b,
                    BlockedUser.blocked_id == user_a,
                ),
            )
        ))
    )
    return bool(result)


async def block_user(
    blocker_id: uuid.UUID,
    username_to_block: str,
    db: AsyncSession,
) -> None:
    target = await db.scalar(
        select(User).where(User.username == username_to_block)
    )
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if target.id == blocker_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot block yourself")

    already_blocked = await is_blocked(blocker_id, target.id, db)
    if already_blocked:
        raise HTTPException(status.HTTP_409_CONFLICT, "User already blocked")

    db.add(BlockedUser(blocker_id=blocker_id, blocked_id=target.id))


async def unblock_user(
    blocker_id: uuid.UUID,
    username_to_unblock: str,
    db: AsyncSession,
) -> None:
    target = await db.scalar(
        select(User).where(User.username == username_to_unblock)
    )
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    record = await db.scalar(
        select(BlockedUser).where(
            BlockedUser.blocker_id == blocker_id,
            BlockedUser.blocked_id == target.id,
        )
    )
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Block not found")

    await db.delete(record)

'''
async def send_share(
    data: SendShareRequest,
    sender: User,
    db: AsyncSession,
) -> ShareCluster:
    # ── 1. Resolve and validate recipients ────────────────────────
    # recipients: list[User] = []
    seen_usernames = set()
    unique_usernames = []
    for username in data.recipient_usernames:
        user = await db.scalar(
            select(User).where(User.username == username.lower())
        )
        if not user or not user.is_active:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"User '{username}' not found",
            )
        if user.id == sender.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Cannot share to yourself",
            )
        if await is_blocked(sender.id, user.id, db):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Cannot share with '{username}'",
            )
        recipients.append(user)

    # ── 2. Resolve and validate files ─────────────────────────────
    files: list[MediaFile] = []
    total_size = 0

    for file_id in data.media_file_ids:
        media = await db.get(MediaFile, file_id)
        if not media or media.owner_id != sender.id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"File {file_id} not found",
            )
        if media.processing_status != "ready":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"File '{media.original_name}' is not ready yet",
            )
        files.append(media)
        total_size += media.size_bytes

    # ── 3. Determine and validate share type ──────────────────────
    mime_types = {f.mime_type for f in files}
    all_media = all(m in MEDIA_MIME_TYPES for m in mime_types)
    all_docs = all(m in DOCUMENT_MIME_TYPES for m in mime_types)

    if not all_media and not all_docs:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot mix media files (images/videos) with documents in one share",
        )

    if all_docs and len(files) > 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Documents must be shared one at a time",
        )

    share_type = "media" if all_media else "document"

    # ── 4. Create cluster ──────────────────────────────────────────
    cluster = ShareCluster(
        sender_id=sender.id,
        share_type=share_type,
        message=data.message,
        file_count=len(files),
        total_size_bytes=total_size,
    )
    db.add(cluster)
    await db.flush()  # get cluster.id

    # ── 5. Add files to cluster ────────────────────────────────────
    for position, media in enumerate(files):
        db.add(ShareClusterFile(
            cluster_id=cluster.id,
            media_file_id=media.id,
            position=position,
        ))

    # ── 6. Fan out to recipients ───────────────────────────────────
    for recipient in recipients:
        db.add(ShareClusterRecipient(
            cluster_id=cluster.id,
            recipient_id=recipient.id,
        ))

    return cluster
'''

async def send_share(
    data: SendShareRequest,
    sender: User,
    db: AsyncSession,
) -> ShareCluster:
    # ── 1. Deduplicate and validate recipients ─────────────────────
    seen_usernames = set()
    unique_usernames = []
    for username in data.recipient_usernames:
        normalized = username.lower().strip()
        if normalized not in seen_usernames:
            seen_usernames.add(normalized)
            unique_usernames.append(normalized)

    if len(unique_usernames) > 5:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot send to more than 5 unique recipients",
        )

    # ── 2. Resolve all recipients first, before writing anything ───
    recipients: list[User] = []
    for username in unique_usernames:
        user = await db.scalar(
            select(User).where(User.username == username)
        )
        if not user or not user.is_active:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"User '{username}' not found",
            )
        if user.id == sender.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Cannot share to yourself",
            )
        if await is_blocked(sender.id, user.id, db):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Cannot share with '{username}'",
            )
        recipients.append(user)

    # ── 3. Resolve all files, before writing anything ──────────────
    files: list[MediaFile] = []
    total_size = 0

    for file_id in data.media_file_ids:
        media = await db.get(MediaFile, file_id)
        if not media or media.owner_id != sender.id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"File {file_id} not found",
            )
        if media.processing_status != "ready":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"File '{media.original_name}' is not ready yet",
            )
        files.append(media)
        total_size += media.size_bytes

    # ── 4. Determine and validate share type ──────────────────────
    mime_types = {f.mime_type for f in files}
    all_media = all(m in MEDIA_MIME_TYPES for m in mime_types)
    all_docs = all(m in DOCUMENT_MIME_TYPES for m in mime_types)

    if not all_media and not all_docs:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot mix media files (images/videos) with documents in one share",
        )

    if all_docs and len(files) > 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Documents must be shared one at a time",
        )

    share_type = "media" if all_media else "document"

    # ── 5. All validation passed — now write to DB ─────────────────
    cluster = ShareCluster(
        sender_id=sender.id,
        share_type=share_type,
        message=data.message,
        file_count=len(files),
        total_size_bytes=total_size,
    )
    db.add(cluster)
    await db.flush()

    # ── 6. Add files to cluster ────────────────────────────────────
    for position, media in enumerate(files):
        db.add(ShareClusterFile(
            cluster_id=cluster.id,
            media_file_id=media.id,
            position=position,
        ))

    # ── 7. Fan out to recipients ───────────────────────────────────
    for recipient in recipients:
        db.add(ShareClusterRecipient(
            cluster_id=cluster.id,
            recipient_id=recipient.id,
        ))
    
    # ── 8. Create notifications for each recipient ─────────────────
    for recipient in recipients:
        await create_notification(
            user_id=recipient.id,
            notification_type="share_received",
            payload={
                "cluster_id": str(cluster.id),
                "sender_username": sender.username,
                "share_type": share_type,
                "file_count": len(files),
                "total_size_bytes": total_size,
                "message": data.message,
            },
            db=db,
        )

    return cluster

'''
Key differences from before:

seen_usernames + unique_usernames actually used for deduplication
recipients properly initialized as empty list before the loop
All validation (recipients + files) happens before any DB writes
Only after all validation passes does the cluster get created
'''

async def get_inbox(
    recipient_id: uuid.UUID,
    cursor: str | None,
    limit: int,
    db: AsyncSession,
) -> tuple[list[InboxItemResponse], str | None, int]:
    """
    Cursor-based inbox. Each item is one ShareClusterRecipient row
    joined with its cluster and sender info.
    Cursor is the created_at timestamp of the last item seen.
    """
    from sqlalchemy import text

    # Base conditions
    conditions = [
        ShareClusterRecipient.recipient_id == recipient_id,
        ShareClusterRecipient.is_deleted_by_recipient == False,
    ]

    # Exclude clusters from blocked users
    blocked_subq = select(BlockedUser.blocker_id).where(
        BlockedUser.blocked_id == recipient_id
    ).union(
        select(BlockedUser.blocked_id).where(
            BlockedUser.blocker_id == recipient_id
        )
    )

    stmt = (
        select(ShareClusterRecipient, ShareCluster, User)
        .join(ShareCluster, ShareCluster.id == ShareClusterRecipient.cluster_id)
        .join(User, User.id == ShareCluster.sender_id)
        .where(*conditions)
        .where(ShareCluster.sender_id.not_in(blocked_subq))
        .order_by(ShareClusterRecipient.created_at.desc())
        .limit(limit + 1)
    )

    if cursor:
        from datetime import datetime
        cursor_dt = datetime.fromisoformat(cursor)
        stmt = stmt.where(ShareClusterRecipient.created_at < cursor_dt)

    # Total unfiltered count
    count_stmt = (
        select(func.count())
        .select_from(ShareClusterRecipient)
        .join(ShareCluster, ShareCluster.id == ShareClusterRecipient.cluster_id)
        .where(*conditions)
        .where(ShareCluster.sender_id.not_in(blocked_subq))
    )
    total = await db.scalar(count_stmt) or 0

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor = (
        rows[-1][0].created_at.isoformat()
        if has_more and rows else None
    )

    items = [
        InboxItemResponse(
            share_recipient_id=scr.id,
            cluster_id=cluster.id,
            sender_username=sender.username,
            sender_display_name=None,  # add profile join later
            share_type=cluster.share_type,
            file_count=cluster.file_count,
            total_size_bytes=cluster.total_size_bytes,
            message=cluster.message,
            is_read=scr.is_read,
            created_at=scr.created_at,
        )
        for scr, cluster, sender in rows
    ]

    return items, next_cursor, total


async def get_sent(
    sender_id: uuid.UUID,
    cursor: str | None,
    limit: int,
    db: AsyncSession,
) -> tuple[list[SentItemResponse], str | None, int]:
    conditions = [ShareCluster.sender_id == sender_id]

    stmt = (
        select(
            ShareCluster,
            func.count(ShareClusterRecipient.id).label("recipient_count"),
        )
        .join(
            ShareClusterRecipient,
            ShareClusterRecipient.cluster_id == ShareCluster.id,
        )
        .where(*conditions)
        .group_by(ShareCluster.id)
        .order_by(ShareCluster.created_at.desc())
        .limit(limit + 1)
    )

    if cursor:
        from datetime import datetime
        cursor_dt = datetime.fromisoformat(cursor)
        stmt = stmt.where(ShareCluster.created_at < cursor_dt)

    total = await db.scalar(
        select(func.count()).select_from(ShareCluster).where(*conditions)
    ) or 0

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor = (
        rows[-1][0].created_at.isoformat()
        if has_more and rows else None
    )

    items = [
        SentItemResponse(
            cluster_id=cluster.id,
            share_type=cluster.share_type,
            file_count=cluster.file_count,
            total_size_bytes=cluster.total_size_bytes,
            message=cluster.message,
            recipient_count=recipient_count,
            created_at=cluster.created_at,
        )
        for cluster, recipient_count in rows
    ]

    return items, next_cursor, total


async def get_cluster_detail(
    cluster_id: uuid.UUID,
    requester_id: uuid.UUID,
    db: AsyncSession,
) -> ClusterDetailResponse:
    """
    Expand a cluster to see all files with download URLs.
    Requester must be either the sender or a recipient.
    Block check runs here — every access, every time.
    """
    cluster = await db.get(ShareCluster, cluster_id)
    if not cluster:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")

    # Check requester is sender or recipient
    is_sender = cluster.sender_id == requester_id
    recipient_row = None

    if not is_sender:
        recipient_row = await db.scalar(
            select(ShareClusterRecipient).where(
                ShareClusterRecipient.cluster_id == cluster_id,
                ShareClusterRecipient.recipient_id == requester_id,
                ShareClusterRecipient.is_deleted_by_recipient == False,
            )
        )
        if not recipient_row:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

        # Block check — run on every access
        if await is_blocked(requester_id, cluster.sender_id, db):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Access denied",
            )

    # Get sender info
    sender = await db.get(User, cluster.sender_id)

    # Get files in order
    file_rows = (await db.execute(
        select(ShareClusterFile, MediaFile)
        .join(MediaFile, MediaFile.id == ShareClusterFile.media_file_id)
        .where(ShareClusterFile.cluster_id == cluster_id)
        .order_by(ShareClusterFile.position)
    )).all()

    files = []
    for scf, media in file_rows:
        # Skip files that were deleted by owner
        if not media:
            continue

        files.append(ShareFileResponse(
            id=media.id,
            original_name=media.original_name,
            file_type=media.file_type,
            mime_type=media.mime_type,
            size_bytes=media.size_bytes,
            position=scf.position,
            # 2 minute TTL — short-lived by policy
            download_url=generate_presigned_get_url(
                media.s3_key, expires_in=PRESIGNED_URL_TTL
            ),
            thumbnail_url=(
                generate_presigned_get_url(
                    media.thumbnail_s3_key, expires_in=PRESIGNED_URL_TTL
                ) if media.thumbnail_s3_key else None
            ),
            duration_secs=media.duration_secs,
        ))

    # Mark as read if recipient
    if recipient_row and not recipient_row.is_read:
        recipient_row.is_read = True
        recipient_row.read_at = datetime.now(timezone.utc)

    return ClusterDetailResponse(
        cluster_id=cluster.id,
        sender_username=sender.username,
        share_type=cluster.share_type,
        message=cluster.message,
        file_count=len(files),
        total_size_bytes=cluster.total_size_bytes,
        files=files,
        is_partially_unavailable=len(files) < cluster.file_count,
        created_at=cluster.created_at,
    )

async def mark_read(
    share_recipient_id: uuid.UUID,
    requester_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    row = await db.get(ShareClusterRecipient, share_recipient_id)
    if not row or row.recipient_id != requester_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    row.is_read = True
    row.read_at = datetime.now(timezone.utc)


async def delete_from_inbox(
    share_recipient_id: uuid.UUID,
    requester_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    row = await db.get(ShareClusterRecipient, share_recipient_id)
    if not row or row.recipient_id != requester_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    row.is_deleted_by_recipient = True
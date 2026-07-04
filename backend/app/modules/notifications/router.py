from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
import uuid

from app.database import get_db
from app.dependencies import get_current_user
from app.core.security import decode_access_token
from app.modules.auth.models import User
from app.modules.notifications import service

router = APIRouter()


async def get_user_from_token(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get user from query param token — used for SSE since
    EventSource doesn't support custom headers."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            from fastapi import HTTPException, status
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    except JWTError:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


@router.get("/stream")
async def notification_stream(
    current_user: User = Depends(get_user_from_token),
):
    return StreamingResponse(
        service.stream_notifications(current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifications = await service.get_notifications(current_user.id, db)
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "payload": n.payload,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await service.get_unread_count(current_user.id, db)
    return {"unread_count": count}


@router.patch("/read-all", status_code=204)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_all_read(current_user.id, db)
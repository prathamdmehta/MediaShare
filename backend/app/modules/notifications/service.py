# app/modules/notifications/service.py

import json
import uuid
import asyncio
import redis.asyncio as aioredis
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.modules.notifications.models import Notification

settings = get_settings()


def get_redis_channel(user_id: uuid.UUID) -> str:
    """Each user has their own Redis pub/sub channel."""
    return f"notifications:{user_id}"


async def create_notification(
    user_id: uuid.UUID,
    notification_type: str,
    payload: dict,
    db: AsyncSession,
) -> Notification:
    """
    Write notification to DB and publish to Redis pub/sub.
    DB ensures persistence. Redis pub/sub ensures real-time delivery.
    """
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        payload=payload,
    )
    db.add(notification)
    await db.flush()

    # Publish to Redis pub/sub for real-time SSE delivery
    # Use a separate async Redis client for pub/sub
    async with aioredis.from_url(settings.redis_url) as r:
        await r.publish(
            get_redis_channel(user_id),
            json.dumps({
                "id": str(notification.id),
                "type": notification_type,
                "payload": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }),
        )

    return notification


async def get_notifications(
    user_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 20,
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def mark_all_read(user_id: uuid.UUID, db: AsyncSession) -> None:
    notifications = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    for n in notifications.scalars():
        n.is_read = True


async def get_unread_count(user_id: uuid.UUID, db: AsyncSession) -> int:
    from sqlalchemy import func
    count = await db.scalar(
        select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    return count or 0


async def stream_notifications(user_id: uuid.UUID):
    """
    Async generator that yields SSE-formatted strings.
    Subscribes to the user's Redis pub/sub channel and
    yields messages as they arrive.
    """
    channel = get_redis_channel(user_id)

    async with aioredis.from_url(settings.redis_url) as r:
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)

        try:
            # Send a heartbeat immediately so client knows connection is alive
            yield "data: {\"type\": \"connected\"}\n\n"

            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=30.0,  # 30 second timeout
                )

                if message and message["type"] == "message":
                    # Format as SSE: data: <json>\n\n
                    yield f"data: {message['data'].decode()}\n\n"
                else:
                    # No message in 30 seconds — send heartbeat
                    # This prevents proxies from closing idle connections
                    yield "data: {\"type\": \"heartbeat\"}\n\n"

                await asyncio.sleep(0.1)

        finally:
            await pubsub.unsubscribe(channel)

# Why heartbeats? Load balancers and proxies (Nginx, Cloudflare) close idle connections after 60-90 seconds. Sending a heartbeat every 30 seconds keeps the connection alive.
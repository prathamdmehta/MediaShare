import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.users.models import Profile
from app.modules.users.schemas import UpdateProfileRequest

async def get_blocked_users(
    current_user_id: uuid.UUID,
    db: AsyncSession,
) -> list[User]:
    from app.modules.shares.models import BlockedUser
    result = await db.execute(
        select(User)
        .join(BlockedUser, BlockedUser.blocked_id == User.id)
        .where(BlockedUser.blocker_id == current_user_id)
        .order_by(BlockedUser.created_at.desc())
    )
    return list(result.scalars().all())

async def get_or_create_profile(user_id: uuid.UUID, db: AsyncSession) -> Profile:
    """Get profile, creating it if it doesn't exist yet."""
    profile = await db.scalar(
        select(Profile).where(Profile.user_id == user_id)
    )
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


async def get_own_profile(user_id: uuid.UUID, db: AsyncSession) -> Profile:
    return await get_or_create_profile(user_id, db)


async def update_profile(
    user_id: uuid.UUID,
    data: UpdateProfileRequest,
    db: AsyncSession
) -> Profile:
    profile = await get_or_create_profile(user_id, db)

    # Only update fields that were actually sent
    # exclude_unset=True means fields not in the request body are ignored
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    return profile


async def get_public_profile(username: str, db: AsyncSession) -> tuple[User, Profile]:
    user = await db.scalar(
        select(User).where(User.username == username.lower())
    )
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    profile = await get_or_create_profile(user.id, db)
    return user, profile

'''
async def search_users(
    query: str,
    cursor: str | None,
    limit: int,
    db: AsyncSession,
) -> tuple[list[tuple[User, Profile]], str | None, int]:
    """
    Cursor-based username search.
    Cursor is the last username seen — we fetch results after it alphabetically.
    """
    query = query.lower().strip()

    if len(query) < 1:
        return [], None, 0

    # Base filter: username starts with query
    base_filter = User.username.ilike(f"{query}%")

    # Total count (for UI to show "23 results")
    total = await db.scalar(
        select(func.count()).where(base_filter, User.is_active == True)
    )

    # Build the paginated query
    stmt = (
        select(User, Profile)
        .join(Profile, Profile.user_id == User.id, isouter=True)
        .where(base_filter, User.is_active == True)
        .order_by(User.username)
        .limit(limit + 1)   # fetch one extra to know if there's a next page
    )

    # Apply cursor — only return users after the last one seen
    if cursor:
        stmt = stmt.where(User.username > cursor)

    rows = (await db.execute(stmt)).all()

    # If we got limit+1 results, there IS a next page
    has_more = len(rows) > limit
    rows = rows[:limit]  # trim the extra one

    next_cursor = rows[-1][0].username if has_more and rows else None

    return rows, next_cursor, total or 0
'''

async def search_users(
    query: str,
    cursor: str | None,
    limit: int,
    current_user_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[list[tuple[User, Profile]], str | None, int]:

    query = query.lower().strip()
    if len(query) < 1:
        return [], None, 0

    # Subquery: all users blocked by or blocking current user
    from app.modules.shares.models import BlockedUser
    blocked_current_user = (
        select(BlockedUser.blocker_id)
        .where(BlockedUser.blocked_id == current_user_id)
    )
    
    base_filter = [
        User.username.ilike(f"{query}%"),
        User.is_active == True,
        User.id != current_user_id,           # exclude self
        User.id.not_in(blocked_current_user),         # exclude blocked
    ]

    total = await db.scalar(
        select(func.count()).where(*base_filter)
    )

    stmt = (
        select(User, Profile)
        .join(Profile, Profile.user_id == User.id, isouter=True)
        .where(*base_filter)
        .order_by(User.username)
        .limit(limit + 1)
    )

    if cursor:
        stmt = stmt.where(User.username > cursor)

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = rows[-1][0].username if has_more and rows else None

    return rows, next_cursor, total or 0

'''
Why exclude_unset=True in update_profile?

# Request body: {"bio": "Hello world"}
# Without exclude_unset: updates display_name=None, bio="Hello world", is_private=False
# With exclude_unset:    updates only bio="Hello world"   ← correct PATCH behaviour

A PATCH should only update what the client explicitly sent. Without exclude_unset=True, sending {"bio": "Hello"} would silently wipe out the user's display_name.
'''
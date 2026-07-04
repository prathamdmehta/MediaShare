from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.users.schemas import SearchResponse, UserSearchResult
from app.modules.search.service import search_users

router = APIRouter()


@router.get("/users", response_model=SearchResponse)
async def search_users_endpoint(
    q: str = Query(..., min_length=1, max_length=30, description="Username prefix to search"),
    cursor: str | None = Query(default=None, description="Pagination cursor"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows, next_cursor, total = await search_users(q, cursor, limit, current_user.id, db)

    results = [
        UserSearchResult(
            username=user.username,
            display_name=profile.display_name if profile else None,
            avatar_url=None,  # Phase 3 adds real URLs
        )
        for user, profile in rows
    ]

    return SearchResponse(
        results=results,
        next_cursor=next_cursor,
        total_count=total,
    )
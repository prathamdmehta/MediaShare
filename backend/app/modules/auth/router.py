from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth import schemas, service
from app.dependencies import get_current_user
from app.modules.auth.models import User

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

from urllib.parse import urlencode
from app.config import get_settings
from fastapi.responses import RedirectResponse

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

@router.post("/register", response_model=schemas.RegisterResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: schemas.RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, access_token, refresh_token = await service.register_user(data, db)

    # Set refresh token as httpOnly cookie — JS cannot read this
    _set_refresh_cookie(response, refresh_token)

    return schemas.RegisterResponse(
        user=schemas.UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: schemas.LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, access_token, refresh_token = await service.login_user(data, db)
    _set_refresh_cookie(response, refresh_token)

    return schemas.TokenResponse(
        access_token=access_token,
        expires_in=15 * 60,  # 15 minutes in seconds
    )


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),  # read from cookie
):
    if not refresh_token:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")

    access_token, new_refresh_token = await service.refresh_tokens(refresh_token, db)
    _set_refresh_cookie(response, new_refresh_token)

    return schemas.TokenResponse(access_token=access_token, expires_in=15 * 60)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        await service.logout_user(refresh_token, db)

    # Clear the cookie regardless
    response.delete_cookie("refresh_token")

# ── NEW: Protected route ───────────────────────────────────────────
@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    # get_current_user already fetched the user from DB
    # we just return it — no DB call needed here
    return schemas.UserResponse.model_validate(current_user)

# ── Helper ─────────────────────────────────────────────────────────

def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,       # JS cannot access this cookie
        secure=False,        # set True in production (requires HTTPS)
        samesite="lax",      # protects against CSRF
        max_age=30 * 24 * 60 * 60,  # 30 days in seconds
        path="/api/v1/auth", # cookie only sent to auth endpoints
    )

@router.get("/google")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    params = {
        "client_id": get_settings().google_client_id,
        "redirect_uri": get_settings().google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(google_auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    user, access_token, refresh_token = await service.google_auth(code, db)

    frontend_url = get_settings().frontend_url
    redirect = RedirectResponse(
        f"{frontend_url}/auth/callback#access_token={access_token}"
    )
    _set_refresh_cookie(redirect, refresh_token)
    return redirect
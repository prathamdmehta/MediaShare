from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.search.router import router as search_router
from app.modules.media.router import router as media_router
from app.modules.shares.router import router as shares_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.modules.notifications.router import router as notifications_router

from app.modules.ai.router import router as ai_router

limiter = Limiter(key_func=get_remote_address)
settings = get_settings()

# lifespan: code that runs at startup and shutdown
# replaces the deprecated @app.on_event("startup")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────
    print(f"Starting MediaShare API [{settings.app_env}]")
    # Future: initialise Redis connection pool, create S3 bucket if dev
    yield
    # ── Shutdown ───────────────────────────────────────────────
    print("Shutting down MediaShare API")
    # Future: close Redis pool, cleanup


app = FastAPI(
    title="MediaShare API",
    description="Direct user-to-user media transfer platform",
    version="0.1.0",
    docs_url="/docs" if settings.is_development else None,   # hide docs in prod
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────
# Allows the React frontend (localhost:5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,     # needed for cookies (refresh token)
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────
# Each module will register its own router here — for now just health
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])    
app.include_router(search_router, prefix="/api/v1/search", tags=["search"])
app.include_router(media_router, prefix="/api/v1/media", tags=["media"])
app.include_router(shares_router, prefix="/api/v1/shares", tags=["shares"])
app.include_router(
    notifications_router,
    prefix="/api/v1/notifications",
    tags=["notifications"]
)
app.include_router(ai_router, prefix="/api/v1/ai", tags=["ai"])

# ── Health check ───────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "ok",
        "environment": settings.app_env,
        "version": "0.1.0",
    }
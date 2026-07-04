# MediaShare Backend — Developer Documentation

> **Stack:** Python · FastAPI · PostgreSQL · Redis · LocalStack (S3)
> **Status:** Phase 0 ✅ Phase 1 (Auth) ✅ Phase 2 (Profiles & Search) ✅ Phase 3 (Upload Pipeline) ✅ Phase 4 (Sharing) ✅ Backend Hardening ✅
> **Last updated:** July 2026

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Phase 0 — Project Setup](#phase-0--project-setup)
- [Phase 1 — Authentication](#phase-1--authentication)
- [Phase 2 — User Profiles and Search](#phase-2--user-profiles-and-search)
- [Phase 3 — File Upload Pipeline](#phase-3--file-upload-pipeline)
- [Phase 4 — Media Sharing](#phase-4--media-sharing)
- [Backend Hardening](#backend-hardening)
- [Database Migrations](#database-migrations)
- [Daily Development Workflow](#daily-development-workflow)
- [API Reference](#api-reference)
- [Key Concepts Explained](#key-concepts-explained)
- [Common Errors and Fixes](#common-errors-and-fixes)
- [What's Coming Next](#whats-coming-next)

---

## Project Overview

MediaShare is a secure, direct user-to-user media transfer platform. Users register with a unique username, build a profile, discover other users by username search, and send media files (images, videos, PDFs, documents) directly to them. No chat, no feed — purely private bilateral file transfer.

```
mediashare/
├── backend/        ← Python / FastAPI (you are here)
└── frontend/       ← React + TypeScript (Phase 5+)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Runtime |
| uv | latest | Dependency management |
| Docker Desktop | latest | Containers |
| VS Code | any | Editor |

Install `uv`:
```bash
# Mac/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, middleware, routers
│   ├── config.py                # Pydantic Settings (all env vars)
│   ├── database.py              # Async SQLAlchemy engine + session
│   ├── dependencies.py          # Shared FastAPI Depends() functions
│   │
│   ├── core/
│   │   ├── security.py          # JWT, bcrypt, token helpers
│   │   └── exceptions.py        # Custom exception handlers
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── models.py        # User, RefreshToken SQLAlchemy models
│   │   │   ├── schemas.py       # Pydantic request/response schemas
│   │   │   ├── service.py       # Business logic (register, login, refresh)
│   │   │   └── router.py        # FastAPI route handlers
│   │   ├── users/
│   │   │   ├── __init__.py
│   │   │   ├── models.py        # Profile SQLAlchemy model
│   │   │   ├── schemas.py       # Profile request/response schemas
│   │   │   ├── service.py       # Profile + search business logic
│   │   │   └── router.py        # /users/me/profile, /users/{username}
│   │   ├── search/
│   │   │   ├── __init__.py
│   │   │   ├── service.py       # Re-exports from users.service
│   │   │   └── router.py        # /search/users?q=
│   │   ├── media/
│   │   │   ├── __init__.py
│   │   │   ├── models.py        # MediaFile SQLAlchemy model
│   │   │   ├── schemas.py       # Upload request/response schemas
│   │   │   ├── service.py       # Initiate/confirm/list/delete logic
│   │   │   ├── router.py        # /media/* endpoints
│   │   │   ├── storage.py       # S3 client, presigned URLs
│   │   │   └── validators.py    # MIME type, size, file type rules
│   │   └── shares/
│   │       ├── __init__.py
│   │       ├── models.py        # ShareCluster, ShareClusterFile,
│   │       │                    # ShareClusterRecipient, BlockedUser
│   │       ├── schemas.py       # Send/inbox/sent/detail schemas
│   │       ├── service.py       # Share, inbox, block business logic
│   │       └── router.py        # /shares/* endpoints
│   │
│   ├── migrations/
│   │   ├── env.py               # Alembic environment config
│   │   ├── script.py.mako       # Migration file template
│   │   └── versions/            # Generated migration files
│   │       ├── d34faed89165_create_users_and_refresh_tokens.py
│   │       └── {id}_add_profiles_table.py
│   │
│   └── workers/                 # Celery tasks (Phase 3+)
│
├── .env                         # Local environment variables (never commit)
├── .env.example                 # Template with keys but no values
├── .gitignore
├── alembic.ini                  # Alembic configuration
├── docker-compose.yml           # All local services
├── Dockerfile                   # Multi-stage production build
└── pyproject.toml               # Dependencies (managed by uv)
```

---

## Environment Setup

### `.env` file

Create `backend/.env` with these values (never commit this file):

```env
# App
APP_ENV=development
APP_SECRET_KEY=dev-secret-key-change-in-production-make-this-long
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://mediashare:mediashare_dev@db:5432/mediashare_db

# Redis
REDIS_URL=redis://redis:6379/0

# AWS / LocalStack
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=mediashare-dev
S3_ENDPOINT_URL=http://localstack:4566

# CORS
FRONTEND_URL=http://localhost:5173

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
```

### `.gitignore`

```
.env
__pycache__/
*.pyc
.venv/
.mypy_cache/
.pytest_cache/
```

---

## Phase 0 — Project Setup

### What Was Built

- Docker Compose environment with 4 services
- Dependency management with `uv`
- FastAPI application skeleton
- PostgreSQL connection with async SQLAlchemy
- Multi-stage Dockerfile
- Health check endpoint

### Docker Services

```yaml
# docker-compose.yml — 4 services
api:        FastAPI app          → localhost:8000
db:         PostgreSQL 16        → localhost:5432
redis:      Redis 7              → localhost:6379
localstack: Fake AWS S3         → localhost:4566
```

All services start with:
```powershell
docker compose up --build
```

**Important:** `db` and `redis` have healthchecks. The `api` service won't start until both pass. This prevents startup race conditions where FastAPI tries to connect before PostgreSQL is ready.

### Volume Mount Strategy

```
Live-synced (no rebuild needed):
  ./app  →  /app/app       ← edit Python files, FastAPI auto-reloads

Baked into image (rebuild required):
  alembic.ini, Dockerfile, pyproject.toml
```

To avoid rebuilding for `alembic.ini` changes, it is also mounted:
```yaml
volumes:
  - ./app:/app/app
  - ./alembic.ini:/app/alembic.ini
```

### Key Files Explained

#### `app/config.py` — Pydantic Settings
```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`lru_cache` ensures Settings is instantiated only once for the entire app lifetime.
Every module calls `get_settings()` and gets the same cached object.
If a required env var is missing, it raises an error at **startup**, not at runtime.

#### `app/database.py` — Async SQLAlchemy
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

`yield` (not `return`) makes this a generator. FastAPI runs code before `yield`
to set up the session, passes it to the route, then runs code after `yield` to
commit or rollback. The session is always cleaned up, even if an exception occurs.

#### `app/main.py` — FastAPI Application
```python
app = FastAPI(
    docs_url="/docs" if settings.is_development else None,  # hide docs in prod
)
```

Swagger UI is only available in development. Each module registers its own router:
```python
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
```

### Verify Phase 0

```powershell
curl -UseBasicParsing http://localhost:8000/health
# Expected: {"status":"ok","environment":"development","version":"0.1.0"}
```

Open Swagger UI: http://localhost:8000/docs

---

## Phase 1 — Authentication

### What Was Built

- `User` and `RefreshToken` SQLAlchemy models
- Pydantic schemas for all auth requests and responses
- Password hashing with `bcrypt`
- JWT access token creation and verification
- Refresh token rotation
- Register, Login, Refresh, Logout endpoints
- `get_current_user` FastAPI dependency

### Auth Flow

```
Register / Login
      │
      ├── Access Token  (JWT, 15 min)  → returned in response body
      └── Refresh Token (opaque UUID, 30 days) → set as httpOnly cookie

Every protected route:
      Request with Bearer token
            │
            ▼
      get_current_user()     ← FastAPI dependency
            │
      decode JWT → get user from DB → return User object
            │
            ▼
      Route handler receives User
```

### Token Strategy

| Token | Type | TTL | Storage | Purpose |
|-------|------|-----|---------|---------|
| Access Token | JWT | 15 min | JS memory (never localStorage) | Authenticate API requests |
| Refresh Token | Opaque UUID | 30 days | httpOnly cookie + DB (hashed) | Get new access tokens |

**Why httpOnly cookie for refresh token?**
JavaScript cannot read httpOnly cookies. This means XSS attacks cannot steal
the refresh token even if malicious JS runs on your page.

**Why short-lived access tokens?**
JWTs cannot be invalidated before expiry (they're stateless). Keeping them
short-lived (15 min) limits the damage window if one is stolen.

### Refresh Token Rotation

Each refresh token is **single-use**. When used to get a new access token:
1. The old refresh token is immediately revoked in the DB
2. A brand new refresh token is issued
3. If an attacker steals an old refresh token and tries to use it after you've
   already used it, the server detects reuse and can invalidate the session

### Database Models

#### `users` table
```
id              UUID PRIMARY KEY
username        VARCHAR(30) UNIQUE NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
hashed_password VARCHAR(255) NOT NULL
is_active       BOOLEAN DEFAULT TRUE
is_verified     BOOLEAN DEFAULT FALSE
role            VARCHAR(20) DEFAULT 'user'
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
last_login_at   TIMESTAMPTZ (nullable)
```

#### `refresh_tokens` table
```
id          UUID PRIMARY KEY
user_id     UUID → users.id
token_hash  VARCHAR(255) UNIQUE    ← SHA-256 of the raw token (never store raw)
expires_at  TIMESTAMPTZ
revoked_at  TIMESTAMPTZ (nullable) ← set when revoked, null = still valid
created_at  TIMESTAMPTZ
```

### Password Hashing with bcrypt

**Why bcrypt and not SHA-256?**
SHA-256 can compute 10 billion hashes/second on a GPU.
bcrypt is deliberately slow — only ~10,000 hashes/second.
A leaked bcrypt database is exponentially harder to crack.

**How bcrypt works:**
```python
# Hash (on register)
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode(), salt)
# Stores: "$2b$12$<22-char-salt><31-char-hash>"

# Verify (on login) — no decryption, re-compute and compare
bcrypt.checkpw(submitted_password.encode(), stored_hash.encode())
```

The salt is embedded in the stored hash. Every password gets a unique random
salt, so two users with the same password have completely different hashes.
This defeats rainbow table attacks.

**Important:** We use `bcrypt` directly, not `passlib`. The `passlib` library
broke with `bcrypt` version 4.x (it couldn't detect the version via
`__about__.__version__`). Direct `bcrypt` has no such issue.

### Timing Attack Prevention

In `login_user()`:
```python
dummy_hash = "$2b$12$dummy_hash_to_prevent_timing_attack_aaaaaaaaaaaaaaaaaaa"
password_ok = verify_password(data.password, user.hashed_password if user else dummy_hash)
```

If we returned early when the user doesn't exist (before running bcrypt),
an attacker could measure response time: fast = email not registered,
slow = email registered but wrong password. Running bcrypt regardless makes
both paths take the same time.

### Username Validation

Enforced in `RegisterRequest` Pydantic schema:
- 3–30 characters
- Lowercase only
- Letters, numbers, underscores only (no spaces, no special chars)
- Validated and normalised (`.lower().strip()`) before hitting the DB

### `get_current_user` Dependency

```python
# app/dependencies.py
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)   # raises JWTError if invalid/expired
    user = await db.get(User, UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    return user
```

Any route that needs authentication adds:
```python
current_user: User = Depends(get_current_user)
```

FastAPI automatically extracts the `Authorization: Bearer <token>` header,
validates the JWT, fetches the user from DB, and injects the `User` object
into the route function.

---

## Phase 2 — User Profiles and Search

### What Was Built

- `Profile` SQLAlchemy model linked to `User` (one-to-one)
- `GET /users/me/profile` — read own profile
- `PATCH /users/me/profile` — update bio and display name (PATCH semantics)
- `GET /users/{username}` — read any user's public profile
- `GET /search/users?q=` — cursor-based username prefix search
- Search module decoupled from users module (swappable to Meilisearch later)

### Why Profile is a Separate Table from User

```
users table — identity and auth (queried on every request)
  username, email, hashed_password, role, is_active

profiles table — display and preferences (queried only when viewing profiles)
  display_name, bio, avatar_s3_key, storage_used_bytes, is_private
```

Auth queries hit `users` constantly via `get_current_user`. Profile data is
only needed when explicitly viewing a profile. Separating them keeps auth
queries lean and lets both tables evolve independently.

### Database Model — `profiles` table

```
id                  UUID PRIMARY KEY
user_id             UUID → users.id (CASCADE DELETE, UNIQUE)
display_name        VARCHAR(60) nullable
bio                 VARCHAR(500) nullable
avatar_s3_key       VARCHAR(500) nullable    ← S3 key, NOT a URL
storage_used_bytes  BIGINT default 0
storage_quota_bytes BIGINT default 2GB
is_private          BOOLEAN default false
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Why store `avatar_s3_key` not the full URL?**
Presigned S3 URLs expire. CDN domains can change. The S3 key is permanent.
URLs are generated fresh at request time from the key. Storing URLs would
require updating millions of rows every time your storage config changes.

### PATCH vs PUT — Why It Matters

```
PUT  /users/me/profile  → replace entire profile (must send ALL fields)
PATCH /users/me/profile → update only fields you send
```

We use `PATCH`. A client sending `{"bio": "Hello"}` should update only `bio`,
leaving `display_name` untouched. This is enforced by `exclude_unset=True`:

```python
update_data = data.model_dump(exclude_unset=True)
# {"bio": "Hello"}  →  only sets bio, never touches display_name
# Without this: display_name would be silently set to None
```

### Cursor-Based Pagination vs Offset

```sql
-- Offset (fragile — breaks when new rows are inserted mid-browse)
SELECT * FROM users LIMIT 20 OFFSET 40;

-- Cursor (stable — always continues from last item seen)
SELECT * FROM users WHERE username > 'last_seen_username'
ORDER BY username LIMIT 20;
```

The cursor is the `username` of the last result you received. New registrations
don't shift the result set. The API returns `next_cursor: null` when there are
no more pages.

**How to use cursor pagination:**
```
Page 1: GET /search/users?q=jo&limit=20
        Response: results=[...20 items...], next_cursor="john_zzz"

Page 2: GET /search/users?q=jo&limit=20&cursor=john_zzz
        Response: results=[...next 20...], next_cursor=null  ← last page
```

### Profile Auto-Creation

Profiles are created lazily — on first access, not at registration.
`get_or_create_profile()` checks if a profile exists and creates one if not:

```python
async def get_or_create_profile(user_id, db):
    profile = await db.scalar(select(Profile).where(Profile.user_id == user_id))
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile
```

This means a brand new user hitting `GET /users/me/profile` immediately gets
a valid (empty) profile rather than a 404.

### Search Module Design

The search router lives in `app/modules/search/` but delegates to
`app/modules/users/service.py`. This separation means:

- Today: PostgreSQL `ILIKE` query (sufficient for < 100K users)
- Future: swap `search/service.py` to call Meilisearch instead
- The router and all callers never change — only the service implementation

### API Endpoints Added

#### `GET /users/me/profile`
Returns the authenticated user's own profile.

**Response `200`:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "display_name": "Pratham Mehta",
  "bio": "Building MediaShare!",
  "avatar_url": null,
  "storage_used_bytes": 0,
  "storage_quota_bytes": 2147483648,
  "is_private": false,
  "created_at": "2026-07-01T20:00:00Z",
  "updated_at": "2026-07-01T20:00:00Z"
}
```

---

#### `PATCH /users/me/profile`
Update own profile. Send only the fields you want to change.

**Request:**
```json
{
  "display_name": "Pratham Mehta",
  "bio": "Building MediaShare!"
}
```

**Response `200`:** Updated profile object (same shape as GET above).

---

#### `GET /users/{username}`
View any user's public profile. Returns limited fields only.

**Response `200`:**
```json
{
  "username": "pratham",
  "display_name": "Pratham Mehta",
  "bio": "Building MediaShare!",
  "avatar_url": null,
  "is_private": false
}
```

**Errors:**
- `404` — user not found or inactive

---

#### `GET /search/users?q={query}`
Search users by username prefix.

**Query params:**
- `q` — search string, min 1 char, max 30 chars (required)
- `cursor` — pagination cursor from previous response (optional)
- `limit` — results per page, 1–50, default 20 (optional)

**Response `200`:**
```json
{
  "results": [
    {
      "username": "pratham",
      "display_name": "Pratham Mehta",
      "avatar_url": null
    }
  ],
  "next_cursor": null,
  "total_count": 1
}
```

---

### Migration Applied

```powershell
alembic revision --autogenerate -m "add profiles table"
alembic upgrade head
# Detected added table 'profiles'
```

`env.py` must import the Profile model for Alembic to detect it:
```python
from app.modules.auth.models import User, RefreshToken  # noqa: F401
from app.modules.users.models import Profile             # noqa: F401
```

**Rule:** Every new model must be imported in `env.py` before running
`--autogenerate`. If it's not imported, Alembic cannot see it and will
generate an empty migration.

---

## Phase 3 — File Upload Pipeline

### What Was Built

- `MediaFile` SQLAlchemy model + Alembic migration
- S3 client wrapper (boto3 → LocalStack in dev, real AWS in prod)
- Two-phase presigned URL upload flow (initiate → PUT to S3 → confirm)
- Celery worker for post-upload processing (thumbnails + video duration)
- Video duration enforcement (> 5 min → silent delete + notification)
- File type and size validation at initiate time

### Why Files Never Touch FastAPI

```
❌ Naive approach: Client → POST /upload → FastAPI → S3
   Problem: 500MB video holds a worker for minutes, uses 500MB RAM

✅ Correct approach:
   Client → POST /media/initiate → FastAPI (metadata only)
   Client → PUT directly to S3 (presigned URL, FastAPI not involved)
   Client → POST /media/confirm → FastAPI (write DB record)
```

FastAPI handles zero bytes of file data. S3 handles all transfers.
Your server stays fast and memory-stable regardless of file size.

### The Two-Phase Upload Flow

```
1. POST /media/initiate
   - Validate MIME type and file size
   - Generate UUID-based S3 key (original filename never in key)
   - Store pending metadata in Redis (TTL: 1 hour)
   - Return presigned PUT URL + upload_id

2. Client PUTs file directly to S3
   - Uses presigned URL (no AWS credentials needed client-side)
   - S3 validates the signature and stores the file

3. POST /media/confirm
   - Look up pending upload in Redis by upload_id
   - Verify ownership (user_id matches)
   - Verify s3_key matches what was issued
   - Write permanent MediaFile row to PostgreSQL
   - Delete Redis pending record
   - Enqueue Celery task for processing
```

### The `upload_id` Pattern

Why not write to DB immediately in `/initiate`?

```
Initiate writes to Redis (TTL: 1 hour, auto-expires)
Confirm writes to PostgreSQL (permanent)
```

If the client initiates but never uploads (abandoned), Redis auto-expires the
record. No orphan DB rows. No cleanup jobs needed.

### Celery Post-Upload Processing

```
Image files:
  Download from S3 → generate 400x400 thumbnail (Pillow)
  Upload thumbnail to S3 → update media_files.thumbnail_s3_key
  Set processing_status = 'ready'

Video files:
  Download from S3 → check duration with ffprobe
  If > 5 minutes → delete from S3, set status = 'rejected', reason stored
  If ok → set duration_secs, status = 'ready'

PDF / Document:
  No processing needed → set status = 'ready' immediately
```

### File Validation Rules

| Type | Allowed MIME types | Max size |
|------|--------------------|----------|
| image | jpeg, png, webp, gif | 20MB |
| video | mp4, quicktime, webm | 500MB |
| pdf | application/pdf | 50MB |
| document | docx, xlsx, pptx, doc, xls, ppt | 50MB |

Documents and media (images/videos) are strictly separated — you cannot
mix them in one share.

### S3 Key Structure

```
uploads/{user_id}/{year}/{month}/{uuid}.{ext}
thumbnails/{media_file_id}/thumb.jpg
avatars/{user_id}/avatar_{timestamp}.{ext}
```

The original filename is **never** used as the S3 key. UUID-based keys
prevent path traversal attacks and enumeration.

### LocalStack URL Fix

Presigned URLs are generated using the internal Docker hostname
`localstack:4566`. The client (browser/terminal) needs `localhost:4566`.

`storage.py` rewrites this automatically in development:
```python
def _fix_localstack_url(url: str) -> str:
    if settings.s3_endpoint_url:
        return url.replace("http://localstack:4566", "http://localhost:4566")
    return url  # production: real AWS URLs untouched
```

### Database Model — `media_files` table

```
id                UUID PRIMARY KEY
owner_id          UUID → users.id (CASCADE DELETE)
original_name     VARCHAR(500)       ← display only, never in S3 key
s3_key            VARCHAR(1000) UNIQUE
mime_type         VARCHAR(100)
file_type         VARCHAR(20)        ← image | video | pdf | document
size_bytes        BIGINT
thumbnail_s3_key  VARCHAR(1000) nullable
duration_secs     INTEGER nullable   ← videos only
width_px          INTEGER nullable
height_px         INTEGER nullable
processing_status VARCHAR(20)        ← pending | ready | rejected | failed
rejection_reason  VARCHAR(200) nullable
created_at        TIMESTAMPTZ
```

### API Endpoints Added

#### `POST /media/initiate`
Begin upload negotiation.

**Request:**
```json
{ "filename": "photo.jpg", "mime_type": "image/jpeg", "size_bytes": 102400 }
```
**Response `200`:**
```json
{
  "upload_id": "uuid",
  "presigned_url": "http://localhost:4566/mediashare-dev/uploads/...",
  "s3_key": "uploads/.../uuid.jpg",
  "expires_in": 3600
}
```

---

#### `POST /media/confirm`
Finalize upload after file is in S3.

**Request:**
```json
{ "upload_id": "uuid", "s3_key": "uploads/.../uuid.jpg" }
```
**Response `201`:** MediaFile object with `processing_status: "pending"`

---

#### `GET /media/`
List own uploaded files ordered by newest first.

---

#### `GET /media/{id}`
Get single file with fresh presigned download URL.

---

#### `DELETE /media/{id}`
Delete file from S3 and DB. Cascades to all shares of this file.

### Migrations Applied

```
dd62be4ab5d2 — add media_files table
```

---

## Phase 4 — Media Sharing

### What Was Built

- `ShareCluster`, `ShareClusterFile`, `ShareClusterRecipient`, `BlockedUser` models
- Share sending with full validation (type rules, file count, recipient count)
- Inbox with cursor pagination and block filtering
- Sent view with recipient count
- Cluster detail with per-file presigned download URLs (2 min TTL)
- Mark as read, soft delete from inbox
- Block/unblock with immediate app-level access revocation

### Feature Spec (Locked)

```
Type A — Media Cluster
  ├── Images only, Videos only, or Images + Videos mixed
  ├── Max 20 files per cluster
  ├── Max 500MB per video, max 5 min duration
  └── Max 5 recipients per send

Type B — Document
  ├── Exactly 1 file per share
  └── Max 5 recipients per send

Rules:
  ├── Cannot mix Type A and Type B in one share
  ├── Cannot share with yourself
  ├── Cannot share with blocked users (either direction)
  └── Only 'ready' files can be shared
```

### Database Models

#### `share_clusters` table
```
id                UUID PRIMARY KEY
sender_id         UUID → users.id
share_type        VARCHAR(20)     ← 'media' | 'document'
message           VARCHAR(500) nullable
file_count        INTEGER         ← denormalised for inbox display
total_size_bytes  BIGINT          ← denormalised for inbox display
created_at        TIMESTAMPTZ
```

#### `share_cluster_files` table
```
id              UUID PRIMARY KEY
cluster_id      UUID → share_clusters.id (CASCADE)
media_file_id   UUID → media_files.id (CASCADE)
position        INTEGER   ← ordering within cluster
```

#### `share_cluster_recipients` table
```
id                      UUID PRIMARY KEY
cluster_id              UUID → share_clusters.id (CASCADE)
recipient_id            UUID → users.id (CASCADE)
is_read                 BOOLEAN default false
read_at                 TIMESTAMPTZ nullable
is_deleted_by_recipient BOOLEAN default false   ← soft delete
created_at              TIMESTAMPTZ
```

#### `blocked_users` table
```
blocker_id   UUID → users.id (PRIMARY KEY composite)
blocked_id   UUID → users.id (PRIMARY KEY composite)
created_at   TIMESTAMPTZ
CONSTRAINT: blocker_id != blocked_id
```

### Security Policy

```
1. Block check runs on EVERY share access request
   Not cached. Authorization is about right now, not at share creation.

2. Presigned URL TTL = 2 minutes
   Short enough that post-block exposure window is minimal.
   Once a block is set, no new URLs are issued.

3. All S3 objects are private
   No public access. Every download requires a fresh presigned URL.
   Every presigned URL requires passing the block + ownership check first.

4. Post-block access revoked immediately at app level
   Existing presigned URLs may work until their 2-min expiry (by design).
   No new URLs are ever issued after a block.

5. Soft delete for inbox items
   is_deleted_by_recipient = True hides the item from the recipient.
   The sender's cluster record is unaffected.
   Allows audit trail without hard deletes.
```

### Why Soft Delete Instead of Hard Delete

If we hard-deleted `ShareClusterRecipient` rows, we'd lose:
- The sender's ability to see who received their share
- Audit trail of what was shared with whom
- The ability to restore accidentally deleted inbox items

Soft delete (`is_deleted_by_recipient = True`) hides the item from
the recipient's inbox while preserving the record for everything else.

### Why Block Check Runs on Every Request

Authorization is about the user's permissions **right now**. If we only
checked at share creation time, a block applied after sharing would have
no effect — the recipient could still view the files indefinitely.
Re-evaluating at request time means blocks take effect instantly.

### Inbox Query Design

The inbox query must:
1. Join `ShareClusterRecipient` → `ShareCluster` → `User` (sender)
2. Filter out soft-deleted items (`is_deleted_by_recipient = False`)
3. Filter out clusters from blocked senders (subquery on `blocked_users`)
4. Order by `created_at DESC` (newest first)
5. Apply cursor (timestamp of last item seen)
6. Fetch `limit + 1` to detect next page

Each inbox item is **one cluster** — not one file. The `file_count` and
`total_size_bytes` columns on `share_clusters` are denormalised so the
inbox query never needs to count files per cluster on every page load.

### API Endpoints Added

#### `POST /shares/send`
Create and fan out a share cluster to up to 5 recipients.

**Request:**
```json
{
  "media_file_ids": ["uuid1", "uuid2"],
  "recipient_usernames": ["userb", "userc"],
  "message": "Check these out!"
}
```
**Response `201`:**
```json
{
  "cluster_id": "uuid",
  "recipient_count": 2,
  "file_count": 2,
  "message": "Share sent successfully"
}
```

**Validation errors:**
- `404` — recipient not found
- `400` — sharing with yourself
- `403` — blocked user in recipient list
- `400` — mixing media and documents
- `400` — document share has more than 1 file
- `400` — file not ready yet
- `422` — more than 20 files or more than 5 recipients

---

#### `GET /shares/inbox`
Paginated inbox. One item per cluster.

**Response `200`:**
```json
{
  "items": [
    {
      "share_recipient_id": "uuid",
      "cluster_id": "uuid",
      "sender_username": "pratham",
      "share_type": "media",
      "file_count": 1,
      "total_size_bytes": 102400,
      "message": "Check this out!",
      "is_read": false,
      "created_at": "2026-07-02T22:01:20Z"
    }
  ],
  "next_cursor": null,
  "total_count": 1
}
```

---

#### `GET /shares/sent`
Paginated sent view with recipient count per cluster.

---

#### `GET /shares/{cluster_id}`
Expand a cluster. Returns all files with 2-minute presigned download URLs.
Marks the cluster as read automatically.

Block check runs here — returns `403` immediately if either party
has blocked the other.

---

#### `PATCH /shares/{share_recipient_id}/read`
Mark a cluster as read. `204 No Content`.

---

#### `DELETE /shares/{share_recipient_id}`
Soft delete from inbox. `204 No Content`.
Sender's record unaffected.

---

#### `POST /users/{username}/block`
Block a user. Immediate effect — all future share accesses return `403`.
`204 No Content`.

---

#### `DELETE /users/{username}/block`
Unblock a user. Access to existing shares is restored immediately.
`204 No Content`.

### Migrations Applied

```
6a4f7fb2326f — add sharing tables
  (share_clusters, share_cluster_files, share_cluster_recipients, blocked_users)
```

### Common Errors and Fixes (Phase 4)

#### `ImportError: cannot import name 'router'`
File exists but content wasn't saved. Open the file in VS Code,
verify the content is there, save, and FastAPI will auto-reload.

#### Presigned URLs contain `localstack:4566` instead of `localhost:4566`
The `_fix_localstack_url()` function in `storage.py` handles this.
If missing, add it and call it in both `generate_presigned_put_url`
and `generate_presigned_get_url`.

---

## Backend Hardening

Applied after Phase 4 — a systematic pass over all phases to fix race conditions,
idempotency gaps, security issues, and stale-state bugs before building the frontend.

### Phase 3 Fixes

#### Fix 1 — `/confirm` Idempotency
**Problem:** Calling `/confirm` twice would either return a raw SQLAlchemy
integrity error (500) if Redis was still alive, or a confusing 404 if Redis
had already been cleaned up.

**Fix:** Before inserting a new `MediaFile` row, check if one already exists
for this `s3_key`. If it does and it belongs to the same user, return it as
a successful response. Double-confirm is now a no-op.

```python
# If Redis key is gone, check if already confirmed
existing = await db.scalar(
    select(MediaFile).where(MediaFile.s3_key == data.s3_key)
)
if existing and existing.owner_id == user_id:
    return existing  # idempotent — return existing record
```

#### Fix 2 — Celery Task Idempotency
**Problem:** Celery can requeue a task if a network blip makes the broker
think it failed. A double-run on an already-processed file wastes resources
and can crash if the file was deleted.

**Fix:** Added an idempotency check at the top of `process_media_file`:
```python
cur.execute("SELECT processing_status FROM media_files WHERE id = %s", (media_file_id,))
row = cur.fetchone()

if not row:
    return  # file deleted before Celery ran

if row[0] in ("ready", "rejected", "failed"):
    return  # already processed — skip entirely
```

Also added `bind=True, max_retries=3` with `self.retry(exc=e, countdown=5)`
so unexpected errors retry up to 3 times with a 5-second delay.

Also added graceful handling for file deleted while Celery was queued:
```python
try:
    download_s3_object(s3_key, local_path)
except Exception:
    # File gone from S3 — mark failed, don't crash
    cur.execute("UPDATE media_files SET processing_status = 'failed' WHERE id = %s", ...)
    return
```

#### Fix 3 — Storage Quota Accounting
**Problem:** `profiles.storage_used_bytes` was always 0. Quota enforcement
was impossible.

**Fix:** `confirm_upload` now increments `storage_used_bytes` after writing
the `MediaFile` row. `delete_own_file` decrements it. Floor at 0 to prevent
negative values from any accounting drift:

```python
profile.storage_used_bytes = max(0, profile.storage_used_bytes - media.size_bytes)
```

Existing data backfilled with:
```sql
UPDATE profiles
SET storage_used_bytes = (
    SELECT COALESCE(SUM(size_bytes), 0)
    FROM media_files
    WHERE owner_id = profiles.user_id
);
```

---

### Phase 4 Fixes

#### Fix 4 — Duplicate Recipients Deduplicated
**Problem:** Sending to `["userb", "userb", "USERB"]` created 3
`ShareClusterRecipient` rows for the same person.

**Fix:** Deduplicate recipients before processing using a set:
```python
seen_usernames = set()
unique_usernames = []
for username in data.recipient_usernames:
    normalized = username.lower().strip()
    if normalized not in seen_usernames:
        seen_usernames.add(normalized)
        unique_usernames.append(normalized)
```

#### Fix 5 — Validate Everything Before Writing Anything
**Problem:** Fan-out loop validated and wrote simultaneously. A failure
midway left some recipients with the share and others without it.

**Fix:** Two-pass approach — resolve and validate ALL recipients and ALL
files first, then write everything. If any recipient or file is invalid,
the entire request is rejected cleanly before a single DB row is written.

```
Pass 1: resolve all recipients → validate each → collect in list
Pass 2: resolve all files → validate each → collect in list
Pass 3: all validation passed → write cluster + files + recipients
```

#### Fix 6 — Deleted File in Cluster Detail
**Problem:** If the owner deleted a file after sharing it, opening the
cluster detail would show mismatched `file_count` vs actual files available.

**Fix:** Cluster detail now returns `len(files)` (actual available count)
instead of the stored `file_count`, plus an `is_partially_unavailable` flag:

```python
return ClusterDetailResponse(
    file_count=len(files),                              # actual, not stored
    is_partially_unavailable=len(files) < cluster.file_count,
    ...
)
```

#### Fix 7 — Blocked Users Hidden from Search
**Problem:** `GET /search/users?q=` returned blocked users in results.
A user who blocked someone could still find them by username.

**Fix:** Search query now excludes all users in a bidirectional block
relationship with the requester:

```python
blocked_subq = (
    select(BlockedUser.blocked_id).where(BlockedUser.blocker_id == current_user_id)
    .union(
        select(BlockedUser.blocker_id).where(BlockedUser.blocked_id == current_user_id)
    )
)
# Added to WHERE clause:
User.id.not_in(blocked_subq)
User.id != current_user_id   # also exclude self from search
```

---

### Phase 1 Fixes

#### Fix 8 — Inactive User Already Handled
`get_current_user` checks `user.is_active` on every request. Suspension
takes effect within the next request — no caching gap. Already correct. ✅

#### Fix 9 — Rate Limiting on Auth Endpoints
**Problem:** No rate limiting on login/register — brute force attacks possible.

**Fix:** Added `slowapi` rate limiting:
```python
# app/main.py
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Login: 5 attempts per minute per IP
@limiter.limit("5/minute")
async def login(request: Request, ...):

# Register: 3 attempts per minute per IP
@limiter.limit("3/minute")
async def register(request: Request, ...):
```

Returns `429 Too Many Requests` when limit is exceeded.

#### Fix 10 — Valid bcrypt Dummy Hash
**Problem:** Timing attack prevention used a malformed dummy hash string.
`bcrypt.checkpw` raised `ValueError: Invalid salt` when user email wasn't found.

**Fix:** Replaced with a real pre-computed bcrypt hash:
```python
# Wrong — not valid bcrypt format
dummy_hash = "$2b$12$dummy_hash_to_prevent_timing..."

# Correct — real bcrypt hash, checkpw works without error
dummy_hash = "$2b$12$K8GpNMDDaB7IZfSDSKpEEuVFMwCpPHCTfVXIzmSaGXrBMXMBnVLYa"
```

---

### Hardening Test Results

| Test | Expected | Result |
|------|----------|--------|
| Login works after hardening | 200 + token | ✅ |
| Rate limit on login (6th attempt) | 429 | ✅ |
| Duplicate recipients deduplicated | 1 row, not 3 | ✅ |
| Blocked user hidden from search | empty results | ✅ |
| Storage quota accurate | 102400 bytes | ✅ |

---

### Remaining Hardening (Nice to Have Before Production)

```
[ ] Orphaned S3 objects cleanup — periodic Celery beat task
    Finds S3 objects with no corresponding media_files row
    Runs nightly, deletes orphans older than 24 hours

[ ] Concurrent PATCH race on profiles — optimistic locking
    Add updated_at check to prevent last-write-wins overwrites

[ ] Lazy profile creation race — SELECT FOR UPDATE
    Prevents two simultaneous first-access requests both inserting a profile

[ ] Alembic version check at startup
    Fail fast if code expects newer schema than DB has

[ ] Transient DB/Redis disconnect handling
    Exponential backoff retry on connection errors after boot
```

---

## Database Migrations

Alembic is the migration tool. Think of it as **git for your database schema**.
Every schema change is a versioned migration file that can be applied or rolled back.

### How Alembic Works

```
Your SQLAlchemy models  ──autogenerate──►  Migration file (.py)
                                                    │
                                              upgrade head
                                                    │
                                                    ▼
                                          PostgreSQL tables
```

The `alembic_version` table in PostgreSQL tracks which migration was last applied.
Alembic only runs migrations newer than the current version.

### Common Commands

```powershell
# Generate a new migration (compares models to DB, writes SQL for you)
docker compose exec api alembic revision --autogenerate -m "description of change"

# Apply all pending migrations
docker compose exec api alembic upgrade head

# Roll back the last migration
docker compose exec api alembic downgrade -1

# See current migration status
docker compose exec api alembic current

# See migration history
docker compose exec api alembic history
```

### Adding a New Column (Example Workflow)

```python
# 1. Add to your SQLAlchemy model
class User(Base):
    ...
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

# 2. Generate migration
# docker compose exec api alembic revision --autogenerate -m "add phone to users"

# 3. Apply it
# docker compose exec api alembic upgrade head
```

### `alembic.ini` — Critical Config

```ini
script_location = app/migrations   # must match where env.py lives
```

`alembic.ini` is baked into the Docker image (not live-mounted normally).
We added it as a volume mount so changes reflect immediately:
```yaml
- ./alembic.ini:/app/alembic.ini
```

### `env.py` — Key Detail

```python
# Strip +asyncpg for migrations (Alembic uses sync psycopg2, not async asyncpg)
config.set_main_option("sqlalchemy.url", settings.database_url.replace("+asyncpg", ""))
```

Your app uses `asyncpg` (async) at runtime. Alembic migrations use `psycopg2`
(sync). Same PostgreSQL, different drivers for different contexts.

Every model must be imported in `env.py` so Alembic can detect it:
```python
from app.modules.auth.models import User, RefreshToken  # noqa: F401
```

---

## Daily Development Workflow

```powershell
# Morning — start everything
docker compose up

# Working — open a second terminal for commands
# Edit files in app/ — FastAPI auto-reloads on save
# No restart needed for Python file changes

# Run a migration after model changes
docker compose exec api alembic revision --autogenerate -m "what changed"
docker compose exec api alembic upgrade head

# Check DB contents
docker compose exec db psql -U mediashare -d mediashare_db -c "SELECT * FROM users;"

# Evening — stop (data persists in Docker volumes)
docker compose down

# Only rebuild when: new package added, Dockerfile changed, files outside app/ changed
docker compose up --build
```

---

## API Reference

Base URL: `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/docs`

### Auth Endpoints

#### `POST /auth/register`
Register a new user.

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response `201`:**
```json
{
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "is_verified": false,
    "created_at": "2026-07-01T20:00:00Z"
  },
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```
Sets `refresh_token` httpOnly cookie automatically.

**Errors:**
- `409` — username or email already taken
- `422` — validation failed (username format, password too short)

---

#### `POST /auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```
Sets `refresh_token` httpOnly cookie automatically.

**Errors:**
- `401` — invalid email or password (intentionally vague — no email enumeration)
- `403` — account suspended

---

#### `POST /auth/refresh`
Get a new access token using the refresh token cookie.

**Request:** No body needed. Refresh token read from httpOnly cookie automatically.

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```
Issues a new refresh token cookie (old one is revoked — rotation).

**Errors:**
- `401` — no refresh token, expired, or already revoked

---

#### `POST /auth/logout`
Revoke the current refresh token and clear the cookie.

**Response `204`:** No content.

---

### Protected Route Usage

All protected routes require:
```
Authorization: Bearer <access_token>
```

In Swagger UI: click **Authorize** (top right) and paste the access token.

---

## Key Concepts Explained

### Why Module-Based Folder Structure?

Grouping by feature (auth, users, media) instead of file type (models, schemas, routes)
means each feature is self-contained. Adding the media upload feature in Phase 3
only requires opening `app/modules/media/` — you never touch `auth/` or `users/`.

### Why Async SQLAlchemy?

FastAPI is async. If you use synchronous database calls, every DB query blocks
the event loop — no other request can be handled until the query finishes.
Async SQLAlchemy (`asyncpg` driver) lets FastAPI handle other requests while
waiting for PostgreSQL to respond.

### Why Pydantic Schemas Separate From SQLAlchemy Models?

SQLAlchemy models represent DB tables. Pydantic schemas validate API data.
They serve different purposes and change for different reasons. Mixing them
creates coupling — a DB column change would break your API contract.

### Why PATCH Uses `exclude_unset=True`

Without it, sending `{"bio": "Hello"}` via PATCH would silently set
`display_name=None` and `is_private=False` because Pydantic fills missing
fields with their defaults before you can check what was actually sent.
`exclude_unset=True` gives you only the fields the client explicitly included.

### Why Cursor Pagination Instead of Offset

Offset pagination (`LIMIT 20 OFFSET 40`) is position-based. If a new user
registers while you're on page 2, every result shifts by one — you skip a
result or see a duplicate. Cursor pagination is value-based — it always
continues from the last item you saw, regardless of new inserts.

### Why `server_default=func.now()` Instead of `default=datetime.now()`?

```python
# Bad — Python sets the time
created_at = Column(DateTime, default=datetime.now)

# Good — PostgreSQL sets the time
created_at = Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

Python's `datetime.now()` is affected by the server's timezone config.
`func.now()` uses PostgreSQL's clock, which is always UTC when configured
correctly. More consistent across deployments.

---

## Common Errors and Fixes

### `unable to get image: open //./pipe/dockerDesktopLinuxEngine`
Docker Desktop is not running. Open Docker Desktop and wait for the engine
to show "Running" before running `docker compose up`.

### `passlib: module 'bcrypt' has no attribute '__about__'`
`passlib` is incompatible with `bcrypt` 4.x.
Fix: remove passlib, use bcrypt directly.
```powershell
uv remove "passlib[bcrypt]"
uv add bcrypt
docker compose up --build
```

### `Can't proceed with --autogenerate: env.py does not provide MetaData`
Alembic is reading the wrong `env.py`. Check `alembic.ini`:
```ini
script_location = app/migrations   # must point to where YOUR env.py is
```
After changing `alembic.ini`, copy it into the running container or rebuild:
```powershell
docker compose cp alembic.ini api:/app/alembic.ini
```

### `Return type of async generator function must be compatible with AsyncGenerator`
Pylance type warning on `get_db()`. Fix the return type annotation:
```python
# Wrong
async def get_db() -> AsyncSession:

# Correct
async def get_db() -> AsyncGenerator[AsyncSession, None]:
```

### PowerShell multiline command errors (`pydantic-settings not recognised`)
PowerShell uses backtick `` ` `` for line continuation, not `\`.
Easiest fix: put everything on one line.

### Changes to files outside `app/` not reflecting in container
`alembic.ini`, `Dockerfile`, `pyproject.toml` are baked into the image.
Changes require a rebuild: `docker compose up --build`

---

## What's Coming Next

### Phase 5 — Frontend (React 18 + TypeScript + Tailwind CSS)

**Stack decision:** React 18 + TypeScript + Tailwind CSS (no component library —
full control, maximum learning, production-grade output)

**Backend additions needed first:**
- [ ] Notification model + migration
- [ ] SSE endpoint (`/notifications/stream`) — real-time push to recipient
- [ ] Celery publishes notification on share creation

**Frontend pages:**
- [ ] Login + Register
- [ ] Profile page (view + edit + avatar upload)
- [ ] Username search (debounced input)
- [ ] Upload page (dropzone → presigned S3 PUT → confirm)
  - Video duration pre-check before upload starts (client-side)
  - Upload progress bar (XHR to presigned URL)
- [ ] Send share modal (select files + recipients)
- [ ] Inbox page (cluster cards, total size, expand to see files)
- [ ] Sent page (sent clusters with recipient count)
- [ ] Notification bell (SSE-powered, real-time badge count)
- [ ] Download saves natively to device (no ZIP)

**Learning approach:** Concept-first then build, same as backend.

---

*This document is updated at the end of each phase.*
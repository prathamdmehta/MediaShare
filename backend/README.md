# MediaShare — Backend Documentation

> **Stack:** Python 3.10 · FastAPI · PostgreSQL · Redis · Celery · LocalStack (S3)
> **Status:** Phase 0 ✅ Phase 1 ✅ Phase 2 ✅ Phase 3 ✅ Phase 4 ✅ Hardening ✅

---

## Table of Contents

- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Phase 0 — Project Setup](#phase-0--project-setup)
- [Phase 1 — Authentication](#phase-1--authentication)
- [Phase 2 — User Profiles and Search](#phase-2--user-profiles-and-search)
- [Phase 3 — File Upload Pipeline](#phase-3--file-upload-pipeline)
- [Phase 4 — Media Sharing](#phase-4--media-sharing)
- [Phase 5 — Notifications (SSE)](#phase-5--notifications-sse)
- [Backend Hardening](#backend-hardening)
- [Database Migrations](#database-migrations)
- [API Reference](#api-reference)
- [Daily Development Workflow](#daily-development-workflow)
- [Common Errors and Fixes](#common-errors-and-fixes)

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
│   │   ├── auth/                # Register, login, JWT, refresh tokens
│   │   ├── users/               # Profiles, search, block/unblock
│   │   ├── media/               # Upload pipeline, S3, Celery
│   │   ├── shares/              # Share clusters, inbox, sent
│   │   ├── notifications/       # SSE stream, notification records
│   │   └── search/              # Username search (delegates to users)
│   │
│   ├── migrations/
│   │   ├── env.py               # Alembic environment config
│   │   └── versions/            # Generated migration files
│   │
│   └── workers/
│       ├── celery_app.py        # Celery instance
│       └── tasks/
│           └── media_processing.py  # Thumbnail gen, video duration check
│
├── localstack-init/
│   └── init.sh                  # Auto-creates S3 bucket + CORS on startup
│
├── .env                         # Local environment variables (never commit)
├── .env.example                 # Template with keys, empty values
├── alembic.ini                  # Alembic config (script_location)
├── docker-compose.yml           # All local services
├── Dockerfile                   # Multi-stage production build
└── pyproject.toml               # Dependencies (managed by uv)
```

---

## Environment Setup

### `.env` file

```env
# App
APP_ENV=development
APP_SECRET_KEY=your-long-secret-key-here
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

### Docker Services

```
api:        FastAPI app          → localhost:8000
worker:     Celery worker        → processes media after upload
db:         PostgreSQL 16        → localhost:5432
redis:      Redis 7              → localhost:6379
localstack: Fake AWS S3         → localhost:4566
```

All start with: `docker compose up --build`

### Volume Mount Strategy

```
Live-synced (no rebuild needed):
  ./app → /app/app              ← edit Python files, FastAPI auto-reloads
  ./alembic.ini → /app/alembic.ini

Baked into image (rebuild required):
  Dockerfile, docker-compose.yml, pyproject.toml
```

---

## Phase 0 — Project Setup

### What Was Built

- Docker Compose with 5 services (api, worker, db, redis, localstack)
- FastAPI skeleton with health endpoint
- Async SQLAlchemy with connection pooling
- Pydantic Settings for type-safe env var loading
- Multi-stage Dockerfile (non-root user, minimal image)
- Alembic migration setup
- LocalStack init script (auto-creates S3 bucket + CORS policy)

### Key Files

**`app/config.py`** — Pydantic Settings with `@lru_cache` so env vars are read once:
```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**`app/database.py`** — Async session with commit/rollback in `get_db()`:
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

**`localstack-init/init.sh`** — Runs on every LocalStack startup:
```bash
awslocal s3 mb s3://mediashare-dev
awslocal s3api put-bucket-cors --bucket mediashare-dev --cors-configuration '{...}'
```

---

## Phase 1 — Authentication

### What Was Built

- `User` and `RefreshToken` SQLAlchemy models
- Password hashing with `bcrypt` (direct, not via passlib)
- JWT access tokens (15 min TTL)
- Refresh token rotation (30 days, stored hashed in DB)
- Refresh token delivered as httpOnly cookie
- `get_current_user` FastAPI dependency
- Rate limiting on auth endpoints (slowapi)

### Auth Flow

```
Register/Login
  → Access Token (JWT, 15 min) → response body
  → Refresh Token (opaque UUID, 30 days) → httpOnly cookie

Every protected route:
  Bearer token → get_current_user() → User object injected
```

### Token Strategy

| Token | Type | TTL | Storage |
|-------|------|-----|---------|
| Access | JWT | 15 min | JS memory |
| Refresh | Opaque UUID | 30 days | httpOnly cookie + DB (SHA-256 hashed) |

### Password Validation Rules

```
Minimum 8 characters, maximum 32
At least 1 uppercase letter (A-Z)
At least 1 lowercase letter (a-z)
At least 1 number (0-9)
At least 1 special character
```

Enforced in `auth/schemas.py` via Pydantic `field_validator`.

### Rate Limiting

```
POST /auth/login      → 5 requests/minute per IP
POST /auth/register   → 3 requests/minute per IP
```

Returns `429 Too Many Requests` when exceeded.

### Timing Attack Prevention

Login always runs bcrypt even when email doesn't exist, preventing
attackers from measuring response time to discover registered emails:
```python
dummy_hash = "$2b$12$K8GpNMDDaB7IZfSDSKpEEuVFMwCpPHCTfVXIzmSaGXrBMXMBnVLYa"
password_ok = verify_password(data.password, user.hashed_password if user else dummy_hash)
```

### Migrations Applied

```
d34faed89165 — create users and refresh_tokens tables
```

---

## Phase 2 — User Profiles and Search

### What Was Built

- `Profile` model (one-to-one with User, created lazily on first access)
- `GET/PATCH /users/me/profile` — view and edit own profile
- `GET /users/{username}` — public profile view
- `GET /search/users?q=` — username prefix search with cursor pagination
- `GET /users/me/blocked` — list of blocked users
- Block/unblock endpoints

### Profile vs User — Why Two Tables

```
users   → identity + auth (queried on every request via get_current_user)
profiles → display data (queried only when viewing profiles)
```

Keeps auth queries lean. Both tables evolve independently.

### PATCH Semantics

```python
update_data = data.model_dump(exclude_unset=True)
```

`exclude_unset=True` means only fields the client explicitly sent get updated.
Sending `{"bio": "Hello"}` never touches `display_name`.

### Cursor-Based Pagination

Search uses keyset pagination (cursor = last username seen) instead of
offset pagination. New registrations don't shift the result set.

```
Page 1: GET /search/users?q=jo&limit=20
        → next_cursor: "john_zzz"

Page 2: GET /search/users?q=jo&limit=20&cursor=john_zzz
        → next_cursor: null  (last page)
```

### Search Block Filtering

Search only hides users who have blocked **you**.
Users **you** have blocked still appear so you can find and unblock them.

### Migrations Applied

```
{id} — add profiles table
```

---

## Phase 3 — File Upload Pipeline

### What Was Built

- `MediaFile` SQLAlchemy model
- Two-phase presigned URL upload (initiate → S3 PUT → confirm)
- Redis pending upload metadata (TTL: 1 hour)
- Celery worker: thumbnail generation (Pillow), video duration check (ffprobe)
- Video rejection: > 5 minutes → delete from S3 + notify owner
- File type and size validation at initiate time
- Storage quota accounting on upload and delete

### Why Files Never Touch FastAPI

```
❌ Naive: Client → POST /upload → FastAPI → S3
   Problem: 500MB video blocks a worker, uses 500MB RAM

✅ Correct:
   Client → POST /media/initiate (metadata only)
   Client → PUT directly to S3 (presigned URL)
   Client → POST /media/confirm (write DB record)
```

### Two-Phase Upload Flow

```
1. POST /media/initiate
   - Validate MIME type + size
   - Store pending metadata in Redis (TTL: 1hr)
   - Return presigned PUT URL + upload_id

2. Client PUTs file directly to S3

3. POST /media/confirm
   - Look up pending record in Redis
   - Verify ownership + s3_key match
   - Write MediaFile row to PostgreSQL
   - Delete Redis pending record
   - Enqueue Celery task
```

### Celery Post-Upload Processing

```
Image → generate 400x400 thumbnail (Pillow) → upload to S3 → status: ready
Video → check duration (ffprobe)
         > 5 min → delete from S3 → status: rejected → create notification
         ≤ 5 min → store duration_secs → status: ready
PDF/Doc → no processing → status: ready immediately
```

### File Validation Rules

| Type | MIME types | Max size |
|------|-----------|---------|
| image | jpeg, png, webp, gif | 20MB |
| video | mp4, quicktime, webm | 500MB |
| pdf | application/pdf | 50MB |
| document | docx, xlsx, pptx, doc, xls, ppt | 50MB |

### S3 Key Structure

```
uploads/{user_id}/{year}/{month}/{uuid}.{ext}
thumbnails/{media_file_id}/thumb.jpg
```

Original filename stored in DB only — never used as S3 key (prevents path traversal).

### Presigned URL Fix (LocalStack)

Two separate boto3 clients:
- `get_s3_client()` — uses `localstack:4566` (internal Docker hostname)
- `get_presign_client()` — uses `localhost:4566` (accessible from browser)

Presigned URL signatures are computed from the endpoint URL. If generated
with `localstack:4566` but PUT to `localhost:4566`, signature mismatch → 403.

### Migrations Applied

```
dd62be4ab5d2 — add media_files table
```

---

## Phase 4 — Media Sharing

### What Was Built

- `ShareCluster`, `ShareClusterFile`, `ShareClusterRecipient`, `BlockedUser` models
- `POST /shares/send` — create cluster, validate rules, fan out to recipients
- `GET /shares/inbox` — cursor-paginated inbox
- `GET /shares/sent` — cursor-paginated sent view
- `GET /shares/{cluster_id}` — expand cluster, generate presigned URLs
- Mark as read, soft delete from inbox
- Block/unblock with immediate access revocation

### Feature Spec

```
Media cluster:
  ├── Images + Videos (any mix), max 20 files
  ├── Each video: max 500MB, max 5 min duration
  └── Max 5 recipients

Document share:
  ├── Exactly 1 file
  └── Max 5 recipients

Rules:
  ├── Cannot mix media and documents in one share
  ├── Cannot share with yourself
  ├── Cannot share with blocked users (either direction)
  └── Only 'ready' files can be shared
```

### Security Policy

```
1. Block check runs on EVERY share access request (not cached)
2. Presigned URL TTL = 2 minutes (short by design)
3. All S3 objects are private — every download requires fresh presigned URL
4. Post-block: no new URLs issued, existing URLs expire within 2 minutes
5. Soft delete: is_deleted_by_recipient hides from inbox, preserves audit trail
```

### Fan-out is Transactional

All recipient + file validation happens before any DB writes.
If any recipient is invalid, the entire request is rejected cleanly.

### Denormalised Counts

`share_clusters.file_count` and `total_size_bytes` are stored directly
on the cluster row — avoids counting files on every inbox load.

### Migrations Applied

```
6a4f7fb2326f — add share_clusters, share_cluster_files,
                share_cluster_recipients, blocked_users tables
```

---

## Phase 5 — Notifications (SSE)

### What Was Built

- `Notification` model (JSONB payload for flexible notification types)
- `GET /notifications/stream` — SSE endpoint (token via query param)
- `GET /notifications/` — list recent notifications
- `GET /notifications/unread-count` — badge count
- `PATCH /notifications/read-all` — mark all read
- Celery publishes to Redis pub/sub on share creation and video rejection

### How SSE Works

```
Client opens GET /notifications/stream?token=...
        ↓
Server subscribes to Redis pub/sub channel "notifications:{user_id}"
        ↓
When Celery creates a notification, it publishes to that channel
        ↓
FastAPI SSE endpoint receives the message and streams it to the client
        ↓
Browser receives event, increments badge count
```

### Why Token in Query Param

`EventSource` (browser SSE API) does not support custom headers.
Token is passed as `?token=<jwt>` and validated server-side.

### Heartbeats

Server sends `{"type": "heartbeat"}` every 30 seconds to prevent
proxies and load balancers from closing idle connections.

### Notification Types

```
share_received: { cluster_id, sender_username, file_count, share_type, message }
file_rejected:  { media_file_id, reason }
```

---

## Backend Hardening

### Phase 3 Fixes

**`/confirm` Idempotency** — Double confirm returns existing record instead of 500:
```python
existing = await db.scalar(select(MediaFile).where(MediaFile.s3_key == data.s3_key))
if existing and existing.owner_id == user_id:
    return existing
```

**Celery Idempotency** — Early exit if already processed:
```python
if row[0] in ("ready", "rejected", "failed"):
    return  # already processed
```

**Celery Retry** — `bind=True, max_retries=3` with 5-second delay on failure.

**File deleted while Celery running** — Graceful `failed` status instead of crash.

**Storage quota accounting** — `confirm_upload` increments, `delete_own_file` decrements:
```python
profile.storage_used_bytes = max(0, profile.storage_used_bytes - media.size_bytes)
```

### Phase 4 Fixes

**Duplicate recipients deduplicated** — Case-insensitive set before processing.

**Validate-first pattern** — All recipients + files validated before any DB writes.

**Deleted file in cluster** — Returns `is_partially_unavailable: true` flag.

**Blocked users hidden from search** — Bidirectional block subquery in search filter.

### Phase 1 Fixes

**Rate limiting** — slowapi on login (5/min) and register (3/min).

**Valid bcrypt dummy hash** — Prevents `ValueError: Invalid salt` on timing attack prevention.

---

## Database Migrations

Alembic tracks schema changes like git tracks code.

```bash
# Generate migration after model changes
docker compose exec api alembic revision --autogenerate -m "description"

# Apply pending migrations
docker compose exec api alembic upgrade head

# Roll back last migration
docker compose exec api alembic downgrade -1

# Check current state
docker compose exec api alembic current
```

### Rule: Every new model must be imported in `app/migrations/env.py`

```python
from app.modules.auth.models import User, RefreshToken          # noqa: F401
from app.modules.users.models import Profile                    # noqa: F401
from app.modules.media.models import MediaFile                  # noqa: F401
from app.modules.shares.models import (                         # noqa: F401
    ShareCluster, ShareClusterFile,
    ShareClusterRecipient, BlockedUser
)
from app.modules.notifications.models import Notification       # noqa: F401
```

### Migration History

```
d34faed89165 — create users and refresh_tokens
{id}         — add profiles table
dd62be4ab5d2 — add media_files table
6a4f7fb2326f — add sharing tables
{id}         — add notifications table
```

---

## API Reference

Base URL: `http://localhost:8000/api/v1`
Swagger UI: `http://localhost:8000/docs`

All protected endpoints require: `Authorization: Bearer <access_token>`

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get tokens |
| POST | `/auth/refresh` | Get new access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Get current user |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/profile` | Get own profile |
| PATCH | `/users/me/profile` | Update profile |
| GET | `/users/me/blocked` | List blocked users |
| GET | `/users/{username}` | Get public profile |
| POST | `/users/{username}/block` | Block a user |
| DELETE | `/users/{username}/block` | Unblock a user |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search/users?q=` | Search users by username |

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media/initiate` | Begin upload, get presigned URL |
| POST | `/media/confirm` | Finalize upload |
| GET | `/media/` | List own files |
| GET | `/media/{id}` | Get file + download URL |
| DELETE | `/media/{id}` | Delete file |

### Shares

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shares/send` | Send files to recipients |
| GET | `/shares/inbox` | Received shares |
| GET | `/shares/sent` | Sent shares |
| GET | `/shares/{cluster_id}` | Expand cluster + download URLs |
| PATCH | `/shares/{id}/read` | Mark as read |
| DELETE | `/shares/{id}` | Remove from inbox |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/stream?token=` | SSE stream |
| GET | `/notifications/` | List notifications |
| GET | `/notifications/unread-count` | Badge count |
| PATCH | `/notifications/read-all` | Mark all read |

---

## Daily Development Workflow

```bash
# Start everything
docker compose up

# Edit files in app/ — FastAPI auto-reloads on save

# After adding a new model — run migration
docker compose exec api alembic revision --autogenerate -m "what changed"
docker compose exec api alembic upgrade head

# Check DB directly
docker compose exec db psql -U mediashare -d mediashare_db -c "SELECT * FROM users;"

# Check worker logs
docker compose logs worker --tail=30

# Stop (data persists)
docker compose down

# Rebuild (after pyproject.toml or Dockerfile changes)
docker compose up --build
```

---

## Common Errors and Fixes

### `unable to get image: open //./pipe/dockerDesktopLinuxEngine`
Docker Desktop not running. Open it and wait for "Engine running".

### `passlib: module 'bcrypt' has no attribute '__about__'`
passlib incompatible with bcrypt 4.x. We use bcrypt directly — no passlib needed.

### `Can't proceed with --autogenerate: env.py does not provide MetaData`
`alembic.ini` pointing to wrong folder. Check `script_location = app/migrations`.

### `403 AccessForbidden` on S3 PUT from browser
Presigned URL generated with `localstack:4566` but browser hits `localhost:4566`.
Fix: use `get_presign_client()` which generates URLs with `localhost:4566`.

### `CORS error` on S3 PUT
LocalStack CORS not configured. The `localstack-init/init.sh` handles this automatically.
If bucket was manually recreated, run: `docker compose down && docker compose up`

### `ImportError: cannot import name 'router'`
File exists but content wasn't saved. Check the file in VS Code, save, wait for reload.

### Celery task stuck in `pending`
Check worker logs: `docker compose logs worker --tail=50`
Common cause: S3 file not found (upload failed before confirm).
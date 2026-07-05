# MediaShare

> Private, direct file transfer between people. No feed. No public. Just you and them.

A production-ready media sharing web application — like WeTransfer meets WhatsApp's direct messaging model, with proper authentication and access control.

---

## What It Does

- Register and login with a secure account
- Find other users by username
- Upload files — images, videos, PDFs, and documents
- Send files directly to one or more specific people (up to 5 recipients)
- Recipients see files in their personal inbox
- Real-time notifications when someone sends you a file
- Block/unblock users — blocks take effect immediately
- Files download natively to your device (Downloads folder / Gallery)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10, FastAPI, PostgreSQL, Redis, Celery |
| Storage | AWS S3 (LocalStack in development) |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Auth | JWT access tokens + refresh token rotation |
| Real-time | Server-Sent Events (SSE) via Redis pub/sub |

---

## Project Structure

```
mediashare/
├── backend/          ← FastAPI application
│   ├── app/          ← Application code
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── README.md     ← Backend documentation
│
├── frontend/         ← React application
│   ├── src/
│   └── README.md     ← Frontend documentation
│
└── README.md         ← This file
```

---

## How to Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- [Node.js](https://nodejs.org) 18+ installed
- [uv](https://astral.sh/uv) installed

### 1. Start the Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Start all services (API + PostgreSQL + Redis + LocalStack)
docker compose up --build
```

Wait for all services to show ready:
```
api-1        | Application startup complete.
worker-1     | celery@... ready.
db-1         | database system is ready to accept connections
redis-1      | Ready to accept connections
localstack-1 | Ready.
```

Run database migrations:
```bash
docker compose exec api alembic upgrade head
```

API is now running at **http://localhost:8000**
Swagger docs at **http://localhost:8000/docs**

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend is now running at **http://localhost:5173**

### 3. Create Your First Account

Open **http://localhost:5173/register** and create an account.

Password requirements:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## Core Features

### File Sharing Rules

**Media clusters (images + videos):**
- Mix of images and videos allowed in one share
- Maximum 20 files per share
- Images: max 20MB each
- Videos: max 500MB, max 5 minutes duration
- Up to 5 recipients per send

**Documents (PDF, DOCX, XLSX, PPTX):**
- One document per share
- Max 50MB
- Up to 5 recipients per send

**Cannot mix media and documents in one share.**

### Privacy and Security

- All files stored privately — no public access
- Presigned URLs expire in 2 minutes (short TTL by design)
- Block a user → they immediately lose access to all shared files
- Blocked users hidden from your search results
- You can still find and unblock users you've blocked from your Profile page

### Real-Time Notifications

When someone shares a file with you, a notification badge appears on the bell icon instantly — no page refresh needed. Click the bell to see recent notifications and navigate to your inbox.

---

## Upcoming Features

```
Deployment
├── Dockerfile for frontend (Nginx)
├── Real AWS S3 (swap endpoint_url)
├── CI/CD pipeline (GitHub Actions)
├── Kubernetes / ECS deployment
└── Custom domain + TLS

Features
├── Avatar upload on profile page
├── Load more / infinite scroll on inbox and sent
├── Share expiry (auto-delete after X days)
├── Download all files in a cluster as ZIP
├── Two-factor authentication (TOTP)
├── OAuth login (Google)
├── Mobile responsive layout
└── Admin dashboard
```

---

## Development Notes

- The backend auto-reloads on file changes inside `backend/app/`
- Changes to `Dockerfile`, `docker-compose.yml`, or `pyproject.toml` require `docker compose up --build`
- LocalStack S3 data persists across restarts via Docker volumes
- The S3 bucket (`mediashare-dev`) is created automatically on LocalStack startup

---

## License

MIT
# Stage 1: dependency install (separate layer = faster rebuilds)
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first (Docker caches this layer if they don't change)
COPY pyproject.toml uv.lock* ./

# Install dependencies into /app/.venv
RUN uv sync --frozen --no-dev


# Stage 2: final image (only what's needed to run)
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Non-root user — never run production containers as root
RUN useradd --create-home appuser

# Copy the venv from builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY --chown=appuser:appuser ./app ./app

# Set PATH so Python finds our venv
ENV PATH="/app/.venv/bin:$PATH"

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Multi-stage build: The builder stage has build tools. The final stage only has what's needed to run. Smaller image = faster deploys, smaller attack surface.
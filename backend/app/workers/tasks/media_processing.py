import json
import os
import subprocess
import tempfile
import uuid

from app.workers.celery_app import celery_app
from app.modules.media.storage import (
    delete_s3_object,
    download_s3_object,
    upload_s3_object,
)
from app.modules.media.validators import MAX_VIDEO_DURATION_SECS


def get_video_duration(file_path: str) -> float:
    """
    Use ffprobe to get video duration in seconds.
    ffprobe is part of the ffmpeg package installed in Dockerfile.
    """
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def generate_thumbnail(file_path: str, output_path: str) -> bool:
    """
    Generate a JPEG thumbnail using Pillow for images.
    Returns True if successful.
    """
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            img.thumbnail((400, 400))
            img.convert("RGB").save(output_path, "JPEG", quality=85)
        return True
    except Exception:
        return False

'''
@celery_app.task(name="process_media_file")
def process_media_file(media_file_id: str, s3_key: str, file_type: str):
    """
    Post-upload processing task.
    Runs after client confirms upload to S3.

    For videos:  check duration → reject if > 5 min, else mark ready
    For images:  generate thumbnail → mark ready
    For others:  mark ready immediately
    """
    # Import here to avoid circular imports at module load time
    # Celery workers need their own DB connection (sync)
    import psycopg2
    from app.config import get_settings

    settings = get_settings()

    # Sync DB connection for Celery (not async)
    db_url = settings.database_url.replace("+asyncpg", "")
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, "media_file")

            # Download file from S3 to temp directory
            download_s3_object(s3_key, local_path)

            if file_type == "video":
                duration = get_video_duration(local_path)

                if duration > MAX_VIDEO_DURATION_SECS:
                    # Reject — delete from S3 and mark in DB
                    delete_s3_object(s3_key)
                    cur.execute(
                        """UPDATE media_files
                           SET processing_status = 'rejected',
                               rejection_reason = %s
                           WHERE id = %s""",
                        (
                            f"Video exceeds 5 minute limit "
                            f"({int(duration // 60)}m {int(duration % 60)}s)",
                            media_file_id,
                        ),
                    )
                    # TODO Phase 4: create notification for owner
                    conn.commit()
                    return

                # Video ok — store duration, mark ready
                cur.execute(
                    """UPDATE media_files
                       SET processing_status = 'ready',
                           duration_secs = %s
                       WHERE id = %s""",
                    (int(duration), media_file_id),
                )

            elif file_type == "image":
                thumb_path = os.path.join(tmpdir, "thumbnail.jpg")
                success = generate_thumbnail(local_path, thumb_path)

                if success:
                    thumb_key = f"thumbnails/{media_file_id}/thumb.jpg"
                    upload_s3_object(thumb_path, thumb_key, "image/jpeg")
                    cur.execute(
                        """UPDATE media_files
                           SET processing_status = 'ready',
                               thumbnail_s3_key = %s
                           WHERE id = %s""",
                        (thumb_key, media_file_id),
                    )
                else:
                    cur.execute(
                        """UPDATE media_files
                           SET processing_status = 'ready'
                           WHERE id = %s""",
                        (media_file_id,),
                    )

            else:
                # PDF, document — no processing needed
                cur.execute(
                    """UPDATE media_files
                       SET processing_status = 'ready'
                       WHERE id = %s""",
                    (media_file_id,),
                )

            conn.commit()

    except Exception as e:
        conn.rollback()
        cur.execute(
            """UPDATE media_files
               SET processing_status = 'failed'
               WHERE id = %s""",
            (media_file_id,),
        )
        conn.commit()
        raise e

    finally:
        cur.close()
        conn.close()
'''

@celery_app.task(name="process_media_file", bind=True, max_retries=3)
def process_media_file(self, media_file_id: str, s3_key: str, file_type: str):
    import psycopg2
    from app.config import get_settings

    settings = get_settings()
    db_url = settings.database_url.replace("+asyncpg", "")
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # ── Idempotency check ──────────────────────────────────────
        # If already processed (ready/rejected/failed), skip entirely
        cur.execute(
            "SELECT processing_status FROM media_files WHERE id = %s",
            (media_file_id,)
        )
        row = cur.fetchone()

        if not row:
            # File was deleted before Celery ran — nothing to do
            cur.close()
            conn.close()
            return

        if row[0] in ("ready", "rejected", "failed"):
            # Already processed — idempotent exit
            cur.close()
            conn.close()
            return

        # ── rest of the task continues as before ──────────────────
        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, "media_file")

            try:
                download_s3_object(s3_key, local_path)
            except Exception:
                # File gone from S3 (deleted by user while queued)
                cur.execute(
                    "UPDATE media_files SET processing_status = 'failed' WHERE id = %s",
                    (media_file_id,)
                )
                conn.commit()
                cur.close()
                conn.close()
                return

            if file_type == "video":
                duration = get_video_duration(local_path)

                if duration > MAX_VIDEO_DURATION_SECS:
                    delete_s3_object(s3_key)
                    cur.execute(
                        """UPDATE media_files
                           SET processing_status = 'rejected',
                               rejection_reason = %s
                           WHERE id = %s""",
                        (
                            f"Video exceeds 5 minute limit "
                            f"({int(duration // 60)}m {int(duration % 60)}s)",
                            media_file_id,
                        ),
                    )
                    # Get owner_id for notification
                    cur.execute(
                        "SELECT owner_id FROM media_files WHERE id = %s",
                        (media_file_id,)
                    )
                    owner_row = cur.fetchone()
                    if owner_row:
                        cur.execute(
                            """INSERT INTO notifications (user_id, type, payload)
                               VALUES (%s, 'file_rejected', %s)""",
                            (
                                str(owner_row[0]),
                                json.dumps({
                                    "media_file_id": media_file_id,
                                    "reason": f"Video exceeds 5 minute limit ({int(duration // 60)}m {int(duration % 60)}s)"
                                }),
                            ),
                        )

                    conn.commit()
                    cur.close()
                    conn.close()
                    return

                cur.execute(
                    """UPDATE media_files
                       SET processing_status = 'ready',
                           duration_secs = %s
                       WHERE id = %s""",
                    (int(duration), media_file_id),
                )

            elif file_type == "image":
                thumb_path = os.path.join(tmpdir, "thumbnail.jpg")
                success = generate_thumbnail(local_path, thumb_path)

                if success:
                    thumb_key = f"thumbnails/{media_file_id}/thumb.jpg"
                    upload_s3_object(thumb_path, thumb_key, "image/jpeg")
                    cur.execute(
                        """UPDATE media_files
                           SET processing_status = 'ready',
                               thumbnail_s3_key = %s
                           WHERE id = %s""",
                        (thumb_key, media_file_id),
                    )
                else:
                    cur.execute(
                        "UPDATE media_files SET processing_status = 'ready' WHERE id = %s",
                        (media_file_id,)
                    )

            else:
                cur.execute(
                    "UPDATE media_files SET processing_status = 'ready' WHERE id = %s",
                    (media_file_id,)
                )

            conn.commit()

    except Exception as e:
        conn.rollback()
        cur.execute(
            "UPDATE media_files SET processing_status = 'failed' WHERE id = %s",
            (media_file_id,)
        )
        conn.commit()
        raise self.retry(exc=e, countdown=5)  # retry after 5 seconds

    finally:
        cur.close()
        conn.close()

'''
What changed:
bind=True, max_retries=3 — task can retry itself on failure, max 3 times
Idempotency check at top — already processed = early exit
File gone from S3 → clean failed status instead of crash
self.retry(exc=e, countdown=5) — retry after 5 seconds on unexpected errors
'''
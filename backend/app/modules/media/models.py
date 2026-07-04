import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MediaFile(Base):
    __tablename__ = "media_files"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    # Stored for display only — never used as S3 key
    original_name: Mapped[str] = mapped_column(String(500))

    # UUID-based S3 key — never guessable from original filename
    s3_key: Mapped[str] = mapped_column(String(1000), unique=True)

    mime_type: Mapped[str] = mapped_column(String(100))
    file_type: Mapped[str] = mapped_column(String(20))  # image|video|pdf|document
    size_bytes: Mapped[int] = mapped_column(BigInteger)

    # Populated by Celery after upload
    thumbnail_s3_key: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )
    duration_secs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    width_px: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height_px: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # pending → ready (normal)
    # pending → rejected (video > 5 min)
    # pending → failed (Celery error)
    processing_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

# Why rejection_reason? Even though we delete rejected files, during the brief window between Celery flagging and deletion, and for the notification message, we need to know why it was rejected. Also useful for debugging.
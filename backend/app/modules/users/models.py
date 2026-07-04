import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,       # one profile per user, enforced at DB level
        index=True,
    )
    display_name: Mapped[str | None] = mapped_column(String(60), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # We store the S3 key, not the full URL
    # URLs change (CDN domain changes, signed URL expiry)
    # The key is permanent — we generate the URL at request time
    avatar_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    storage_used_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    storage_quota_bytes: Mapped[int] = mapped_column(
        BigInteger, default=2 * 1024 * 1024 * 1024  # 2GB default
    )
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

# Why store avatar_s3_key not the full URL? S3 presigned URLs expire. CDN domains can change. The S3 key (avatars/user-uuid/avatar.jpg) is permanent — you generate a fresh URL from it at request time. If you stored the URL, you'd have to update millions of rows every time anything about your storage setup changes.
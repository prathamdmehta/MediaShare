# app/modules/shares/models.py

import uuid
from datetime import datetime
from sqlalchemy import (
    String, Boolean, BigInteger, Integer,
    DateTime, ForeignKey, func, CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ShareCluster(Base):
    """
    One 'send event'. Created once per send action regardless of
    how many recipients or files are involved.
    """
    __tablename__ = "share_clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    # 'media' (images/videos) or 'document' (one doc at a time)
    share_type: Mapped[str] = mapped_column(String(20))

    # Optional caption — no chat, just a label
    message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Denormalised for inbox display — avoids joins on every inbox load
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    total_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ShareClusterFile(Base):
    """
    Which files belong to a cluster.
    Max 20 for media clusters, exactly 1 for document clusters.
    """
    __tablename__ = "share_cluster_files"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("share_clusters.id", ondelete="CASCADE"),
        index=True,
    )
    media_file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("media_files.id", ondelete="CASCADE"),
        index=True,
    )
    # Position for consistent ordering in the expanded view
    position: Mapped[int] = mapped_column(Integer, default=0)


class ShareClusterRecipient(Base):
    """
    Who receives a cluster. One row per recipient.
    Max 5 recipients per cluster.
    This is what appears in a recipient's inbox.
    """
    __tablename__ = "share_cluster_recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("share_clusters.id", ondelete="CASCADE"),
        index=True,
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Soft delete — recipient removes from their inbox
    # Sender's cluster record is unaffected
    is_deleted_by_recipient: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BlockedUser(Base):
    """
    A blocks B. Bidirectional check at access time.
    If A blocks B OR B blocks A → no sharing in either direction.
    """
    __tablename__ = "blocked_users"

    blocker_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    blocked_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        # Cannot block yourself
        CheckConstraint("blocker_id != blocked_id", name="no_self_block"),
    )
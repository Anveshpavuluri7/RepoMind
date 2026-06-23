import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    github_repo_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(512), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_branch: Mapped[str] = mapped_column(String(255), default="main")
    language: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    webhook_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="repositories")
    commits: Mapped[list["Commit"]] = relationship(
        "Commit", back_populates="repository", cascade="all, delete-orphan"
    )
    pull_requests: Mapped[list["PullRequest"]] = relationship(
        "PullRequest", back_populates="repository", cascade="all, delete-orphan"
    )
    branches: Mapped[list["Branch"]] = relationship(
        "Branch", back_populates="repository", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation", back_populates="repository", cascade="all, delete-orphan"
    )

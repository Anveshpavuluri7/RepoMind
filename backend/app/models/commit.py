import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, String, Text, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class Commit(Base):
    __tablename__ = "commits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
    )
    sha: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author_login: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    committed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    files_changed: Mapped[int] = mapped_column(Integer, default=0)
    additions: Mapped[int] = mapped_column(Integer, default=0)
    deletions: Mapped[int] = mapped_column(Integer, default=0)
    diff_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI Analysis fields
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_what_changed: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_why_changed: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_related_files: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_embedded: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    repository: Mapped["Repository"] = relationship("Repository", back_populates="commits")

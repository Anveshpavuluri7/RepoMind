from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CommitAIAnalysis(BaseModel):
    summary: str | None = None
    what_changed: str | None = None
    why_changed: str | None = None
    impact: str | None = None
    risk_level: str | None = None
    related_files: list[str] | None = None
    analyzed_at: datetime | None = None


class CommitResponse(BaseModel):
    id: UUID
    repo_id: UUID
    sha: str
    author_name: str | None = None
    author_email: str | None = None
    author_login: str | None = None
    message: str | None = None
    committed_at: datetime | None = None
    branch: str | None = None
    files_changed: int = 0
    additions: int = 0
    deletions: int = 0
    ai_analysis: CommitAIAnalysis | None = None
    is_embedded: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_analysis(cls, commit) -> "CommitResponse":
        analysis = None
        if commit.ai_summary:
            analysis = CommitAIAnalysis(
                summary=commit.ai_summary,
                what_changed=commit.ai_what_changed,
                why_changed=commit.ai_why_changed,
                impact=commit.ai_impact,
                risk_level=commit.ai_risk_level,
                related_files=commit.ai_related_files,
                analyzed_at=commit.ai_analyzed_at,
            )
        return cls(
            id=commit.id,
            repo_id=commit.repo_id,
            sha=commit.sha,
            author_name=commit.author_name,
            author_email=commit.author_email,
            author_login=commit.author_login,
            message=commit.message,
            committed_at=commit.committed_at,
            branch=commit.branch,
            files_changed=commit.files_changed,
            additions=commit.additions,
            deletions=commit.deletions,
            ai_analysis=analysis,
            is_embedded=commit.is_embedded,
            created_at=commit.created_at,
        )


class CommitListResponse(BaseModel):
    items: list[CommitResponse]
    total: int
    page: int
    page_size: int

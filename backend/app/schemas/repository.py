from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class RepositoryBase(BaseModel):
    full_name: str
    name: str
    description: str | None = None
    language: str | None = None
    is_private: bool = False
    default_branch: str = "main"


class RepositoryCreate(BaseModel):
    github_repo_id: int
    full_name: str


class RepositoryResponse(RepositoryBase):
    id: UUID
    github_repo_id: int
    last_synced_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RepositoryStats(BaseModel):
    total_commits: int = 0
    total_prs: int = 0
    total_branches: int = 0
    analyzed_commits: int = 0

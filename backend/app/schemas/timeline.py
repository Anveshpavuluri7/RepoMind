from datetime import datetime
from uuid import UUID
from typing import Literal
from pydantic import BaseModel


class TimelineEvent(BaseModel):
    id: UUID
    type: Literal["commit", "pull_request", "branch"]
    timestamp: datetime
    title: str
    author: str | None = None
    branch: str | None = None
    ai_summary: str | None = None
    risk_level: str | None = None
    sha: str | None = None
    pr_number: int | None = None
    files_changed: int | None = None


class TimelineResponse(BaseModel):
    events: list[TimelineEvent]
    total: int

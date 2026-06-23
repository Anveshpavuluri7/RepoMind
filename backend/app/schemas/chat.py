from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ChatSource(BaseModel):
    type: str
    id: UUID
    sha: str | None = None
    title: str
    relevance_score: float | None = None


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    id: UUID
    question: str
    answer: str
    sources: list[ChatSource]
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    items: list[ChatResponse]
    total: int

from uuid import UUID

from fastapi import APIRouter, Query

from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse, ChatSource
from app.services import chat_service
from app.dependencies import CurrentUser, DB

router = APIRouter(tags=["chat"])


@router.post("/repos/{repo_id}/chat", response_model=ChatResponse, status_code=201)
async def ask_question(
    repo_id: UUID,
    body: ChatRequest,
    current_user: CurrentUser,
    db: DB,
):
    conversation = await chat_service.ask_question(
        db=db,
        repo_id=repo_id,
        user_id=current_user.id,
        question=body.question,
    )
    sources = [ChatSource(**s) for s in (conversation.sources or [])]
    return ChatResponse(
        id=conversation.id,
        question=conversation.question,
        answer=conversation.answer or "",
        sources=sources,
        created_at=conversation.created_at,
    )


@router.get("/repos/{repo_id}/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    repo_id: UUID,
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    conversations, total = await chat_service.get_chat_history(
        db, repo_id, current_user.id, page, page_size
    )
    items = [
        ChatResponse(
            id=c.id,
            question=c.question,
            answer=c.answer or "",
            sources=[ChatSource(**s) for s in (c.sources or [])],
            created_at=c.created_at,
        )
        for c in conversations
    ]
    return ChatHistoryResponse(items=items, total=total)

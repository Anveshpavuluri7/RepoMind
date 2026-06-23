import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.conversation import Conversation
from app.models.repository import Repository
from app.ai.rag_chain import answer_repository_question
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


async def ask_question(
    db: AsyncSession,
    repo_id: UUID,
    user_id: UUID,
    question: str,
) -> Conversation:
    result = await answer_repository_question(str(repo_id), question)

    conversation = Conversation(
        repo_id=repo_id,
        user_id=user_id,
        question=question,
        answer=result.answer,
        sources=result.sources,
    )
    db.add(conversation)
    await db.flush()
    return conversation


async def get_chat_history(
    db: AsyncSession,
    repo_id: UUID,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Conversation], int]:
    offset = (page - 1) * page_size
    total_q = await db.execute(
        select(func.count())
        .select_from(Conversation)
        .where(Conversation.repo_id == repo_id, Conversation.user_id == user_id)
    )
    total = total_q.scalar_one()
    result = await db.execute(
        select(Conversation)
        .where(Conversation.repo_id == repo_id, Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total

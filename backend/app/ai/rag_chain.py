import logging
from dataclasses import dataclass

from langchain_anthropic import ChatAnthropic
from langchain.schema import Document

from app.config import settings
from app.ai.prompts.qa_system import qa_prompt
from app.ai.vector_store import similarity_search
from app.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)


@dataclass
class RAGResult:
    answer: str
    sources: list[dict]


def _format_context(docs: list[tuple[Document, float]]) -> str:
    blocks = []
    for doc, score in docs:
        meta = doc.metadata
        doc_type = meta.get("type", "unknown")
        if doc_type == "commit":
            header = f"[Commit] SHA: {meta.get('sha', 'unknown')} | Score: {score:.2f}"
        else:
            header = f"[PR #{meta.get('pr_number', '?')}] | Score: {score:.2f}"
        blocks.append(f"{header}\n{doc.page_content}")
    return "\n\n---\n\n".join(blocks)


def _extract_sources(docs: list[tuple[Document, float]]) -> list[dict]:
    sources = []
    for doc, score in docs:
        meta = doc.metadata
        sources.append({
            "type": meta.get("type", "unknown"),
            "id": meta.get("commit_id") or meta.get("pr_id"),
            "sha": meta.get("sha"),
            "title": meta.get("title") or meta.get("message", "")[:80],
            "relevance_score": round(float(score), 4),
        })
    return sources


async def _db_fallback_context(repo_id: str, question: str) -> tuple[str, list[dict]]:
    """When ChromaDB is unavailable, build context from raw DB commits."""
    from app.core.database import AsyncSessionLocal
    from app.models.commit import Commit
    from sqlalchemy import select, UUID as SAUUID
    import uuid

    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(Commit)
            .where(Commit.repo_id == uuid.UUID(repo_id))
            .order_by(Commit.committed_at.desc())
            .limit(20)
        )
        commits = list(rows.scalars().all())

    if not commits:
        return "", []

    blocks = []
    sources = []
    for c in commits:
        parts = [f"SHA: {c.sha[:8]}  Author: {c.author_login or c.author_name}"]
        parts.append(f"Message: {c.message or ''}")
        if c.ai_summary:
            parts.append(f"AI Summary: {c.ai_summary}")
        if c.ai_what_changed:
            parts.append(f"What changed: {c.ai_what_changed}")
        if c.ai_why_changed:
            parts.append(f"Why: {c.ai_why_changed}")
        if c.ai_risk_level:
            parts.append(f"Risk: {c.ai_risk_level}")
        blocks.append("\n".join(parts))
        sources.append({
            "type": "commit",
            "id": str(c.id),
            "sha": c.sha,
            "title": (c.message or "")[:80],
            "relevance_score": 0.0,
        })

    return "\n\n---\n\n".join(blocks), sources


async def answer_repository_question(repo_id: str, question: str) -> RAGResult:
    docs_with_scores = []
    try:
        docs_with_scores = await similarity_search(repo_id, question, k=8)
    except Exception as e:
        logger.warning("Vector search unavailable, falling back to DB: %s", e)

    if docs_with_scores:
        context = _format_context(docs_with_scores)
        sources = _extract_sources(docs_with_scores)
    else:
        logger.info("No vector results for repo %s — using DB fallback", repo_id)
        context, sources = await _db_fallback_context(repo_id, question)

    if not context:
        return RAGResult(
            answer=(
                "No commits have been synced for this repository yet. "
                "Click **Sync** on the repository page to import commits, "
                "then click **Analyze History** to enable AI-powered answers."
            ),
            sources=[],
        )

    llm = ChatAnthropic(
        model=settings.anthropic_model,
        anthropic_api_key=settings.anthropic_api_key,
    )

    chain = qa_prompt | llm

    try:
        response = await chain.ainvoke({"context": context, "question": question})
        return RAGResult(answer=response.content.strip(), sources=sources)
    except Exception as e:
        logger.error("RAG chain failed: %s", e)
        raise AIServiceError(f"Failed to generate answer: {e}")

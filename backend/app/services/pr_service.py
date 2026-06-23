import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.pull_request import PullRequest
from app.models.repository import Repository
from app.ai.pr_analyzer import analyze_pr
from app.ai.embeddings import build_pr_document
from app.ai.vector_store import upsert_pr_embedding

logger = logging.getLogger(__name__)


async def get_prs_for_repo(
    db: AsyncSession,
    repo_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[PullRequest], int]:
    offset = (page - 1) * page_size
    total_q = await db.execute(
        select(func.count()).select_from(PullRequest).where(PullRequest.repo_id == repo_id)
    )
    total = total_q.scalar_one()
    result = await db.execute(
        select(PullRequest)
        .where(PullRequest.repo_id == repo_id)
        .order_by(PullRequest.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


async def analyze_and_embed_pr(
    db: AsyncSession,
    pr: PullRequest,
    repo: Repository,
) -> None:
    try:
        analysis = await analyze_pr(
            repo_name=repo.full_name,
            title=pr.title or "",
            number=pr.number,
            author=pr.author_login or "Unknown",
            state=pr.state or "",
            base_branch=pr.base_branch or "",
            head_branch=pr.head_branch or "",
            body=pr.body or "",
        )

        pr.ai_summary = analysis.summary
        pr.ai_impact = analysis.impact
        pr.ai_risk_level = analysis.risk_level
        pr.ai_analyzed_at = datetime.now(timezone.utc)

        await db.flush()

        doc_text = build_pr_document(pr)
        await upsert_pr_embedding(
            repo_id=str(repo.id),
            pr_id=str(pr.id),
            document=doc_text,
            metadata={
                "pr_number": pr.number,
                "title": pr.title or "",
                "author": pr.author_login or "",
                "state": pr.state or "",
                "risk_level": pr.ai_risk_level or "low",
            },
        )

        pr.is_embedded = True
        await db.flush()

        logger.info("Analyzed and embedded PR #%d", pr.number)

    except Exception as e:
        logger.error("Failed to analyze PR #%d: %s", pr.number, e)
        raise


async def get_pr_by_id(db: AsyncSession, pr_id: UUID) -> PullRequest | None:
    result = await db.execute(select(PullRequest).where(PullRequest.id == pr_id))
    return result.scalar_one_or_none()

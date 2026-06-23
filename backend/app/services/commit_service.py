import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.commit import Commit
from app.models.repository import Repository
from app.services import github_service
from app.ai.commit_analyzer import analyze_commit
from app.ai.embeddings import build_commit_document
from app.ai.vector_store import upsert_commit_embedding
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


async def analyze_commits_batch(repo_id: UUID, access_token: str) -> dict:
    """AI-analyze all un-analyzed commits for a repo. Creates its own DB session."""
    from app.core.database import AsyncSessionLocal

    results = {"analyzed": 0, "failed": 0}
    print(f"[ANALYZE] analyze_commits_batch STARTED for repo {repo_id}", flush=True)
    logger.info("analyze_commits_batch started for repo %s", repo_id)

    try:
        async with AsyncSessionLocal() as db:
            repo_result = await db.execute(select(Repository).where(Repository.id == repo_id))
            repo = repo_result.scalar_one_or_none()
            if not repo:
                logger.error("Repo %s not found for batch analysis", repo_id)
                return results

            unanalyzed = await db.execute(
                select(Commit)
                .where(Commit.repo_id == repo_id, Commit.ai_analyzed_at.is_(None))
                .order_by(Commit.committed_at.desc())
            )
            commits = list(unanalyzed.scalars().all())

            logger.info("Batch analyzing %d commits for %s", len(commits), repo.full_name)

            for commit in commits:
                try:
                    await analyze_and_embed_commit(db, commit, repo, access_token)
                    await db.commit()
                    results["analyzed"] += 1
                    logger.info("Progress: %d analyzed so far", results["analyzed"])
                except Exception as e:
                    await db.rollback()
                    logger.error("Failed to analyze commit %s: %s", commit.sha[:8], e, exc_info=True)
                    results["failed"] += 1
    except Exception as e:
        logger.error("analyze_commits_batch outer failure: %s", e, exc_info=True)

    logger.info("Batch analysis done: %s", results)
    return results


async def get_commit_by_sha(db: AsyncSession, sha: str) -> Commit | None:
    result = await db.execute(select(Commit).where(Commit.sha == sha))
    return result.scalar_one_or_none()


async def get_commits_for_repo(
    db: AsyncSession,
    repo_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Commit], int]:
    offset = (page - 1) * page_size
    total_q = await db.execute(
        select(func.count()).select_from(Commit).where(Commit.repo_id == repo_id)
    )
    total = total_q.scalar_one()
    result = await db.execute(
        select(Commit)
        .where(Commit.repo_id == repo_id)
        .order_by(Commit.committed_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all(), total


async def store_commit_from_webhook(
    db: AsyncSession,
    repo_id: UUID,
    sha: str,
    author_name: str,
    author_email: str,
    author_login: str | None,
    message: str,
    committed_at: datetime,
    branch: str,
) -> Commit:
    existing = await get_commit_by_sha(db, sha)
    if existing:
        return existing

    commit = Commit(
        repo_id=repo_id,
        sha=sha,
        author_name=author_name,
        author_email=author_email,
        author_login=author_login,
        message=message,
        committed_at=committed_at,
        branch=branch,
    )
    db.add(commit)
    await db.flush()
    return commit


async def analyze_and_embed_commit(
    db: AsyncSession,
    commit: Commit,
    repo: Repository,
    access_token: str,
) -> None:
    """Fetch diff, run AI analysis, store results, and embed into ChromaDB."""
    try:
        detail = await github_service.fetch_commit_detail(
            access_token=access_token,
            full_name=repo.full_name,
            sha=commit.sha,
        )

        commit.files_changed = detail.files_changed
        commit.additions = detail.additions
        commit.deletions = detail.deletions
        commit.diff_content = detail.diff[:50000]  # cap stored diff at 50k chars

        analysis = await analyze_commit(
            repo_name=repo.full_name,
            branch=commit.branch or "",
            author=commit.author_name or commit.author_login or "Unknown",
            message=commit.message or "",
            diff=detail.diff,
            files_changed=detail.files_changed,
            additions=detail.additions,
            deletions=detail.deletions,
        )

        commit.ai_summary = analysis.summary
        commit.ai_what_changed = analysis.what_changed
        commit.ai_why_changed = analysis.why_changed
        commit.ai_impact = analysis.impact
        commit.ai_risk_level = analysis.risk_level
        commit.ai_related_files = analysis.related_files
        commit.ai_analyzed_at = datetime.now(timezone.utc)

        await db.flush()

        # Build embedding document and store in ChromaDB
        doc_text = build_commit_document(commit)
        await upsert_commit_embedding(
            repo_id=str(repo.id),
            commit_id=str(commit.id),
            document=doc_text,
            metadata={
                "sha": commit.sha,
                "message": (commit.message or "")[:200],
                "author": commit.author_login or commit.author_name or "",
                "branch": commit.branch or "",
                "risk_level": commit.ai_risk_level or "low",
                "committed_at": commit.committed_at.isoformat() if commit.committed_at else "",
            },
        )

        commit.is_embedded = True
        await db.flush()

        logger.info("Analyzed and embedded commit %s", commit.sha[:8])

    except Exception as e:
        logger.error("Failed to analyze commit %s: %s", commit.sha[:8], e)
        raise

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.repository import Repository
from app.models.commit import Commit
from app.models.branch import Branch
from app.models.pull_request import PullRequest
from app.models.user import User
from app.services import github_service
from app.services.commit_service import analyze_and_embed_commit
from app.services.pr_service import analyze_and_embed_pr

logger = logging.getLogger(__name__)


async def sync_repository_task(repo_id: UUID, user_id: UUID) -> None:
    """Background-task-safe sync: creates its own DB session."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            repo = (await db.execute(select(Repository).where(Repository.id == repo_id))).scalar_one_or_none()
            user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            if not repo or not user:
                logger.error("Sync task: repo or user not found")
                return
            await sync_repository(db, repo, user)
            await db.commit()
            logger.info("Sync complete for %s", repo.full_name)
        except Exception as e:
            await db.rollback()
            logger.error("Background sync failed: %s", e)


async def sync_repository(db: AsyncSession, repo: Repository, user: User) -> dict:
    """Full sync of a repository: commits, branches, PRs."""
    stats = {"commits": 0, "branches": 0, "pull_requests": 0, "errors": []}

    access_token = user.github_token
    if not access_token:
        raise ValueError("User has no GitHub access token")

    # Sync branches
    try:
        branches_data = await github_service.fetch_repository_branches(
            access_token, repo.full_name
        )
        for b in branches_data:
            existing = await db.execute(
                select(Branch).where(
                    Branch.repo_id == repo.id,
                    Branch.name == b["name"],
                )
            )
            branch = existing.scalar_one_or_none()
            if not branch:
                branch = Branch(repo_id=repo.id, name=b["name"])
                db.add(branch)
            branch.sha = b["commit"]["sha"]
            branch.is_default = b["name"] == repo.default_branch
            stats["branches"] += 1
        await db.flush()
    except Exception as e:
        logger.error("Branch sync failed: %s", e)
        stats["errors"].append(f"Branch sync: {e}")

    # Sync commits from default branch
    try:
        commits_data = await github_service.fetch_repository_commits(
            access_token, repo.full_name, repo.default_branch, per_page=50
        )
        for c in commits_data:
            sha = c["sha"]
            existing = await db.execute(select(Commit).where(Commit.sha == sha))
            commit = existing.scalar_one_or_none()
            if not commit:
                commit_data = c.get("commit", {})
                commit = Commit(
                    repo_id=repo.id,
                    sha=sha,
                    author_name=commit_data.get("author", {}).get("name"),
                    author_email=commit_data.get("author", {}).get("email"),
                    author_login=c.get("author", {}).get("login") if c.get("author") else None,
                    message=commit_data.get("message"),
                    committed_at=_parse_dt(commit_data.get("author", {}).get("date")),
                    branch=repo.default_branch,
                )
                db.add(commit)
                await db.flush()
                stats["commits"] += 1

                # Analyze commits in background (skip during initial sync to be fast)
                # Full analysis triggered per-commit via webhook in production
    except Exception as e:
        logger.error("Commits sync failed: %s", e)
        stats["errors"].append(f"Commits sync: {e}")

    # Sync PRs
    try:
        prs_data = await github_service.fetch_pull_requests(
            access_token, repo.full_name, state="all", per_page=50
        )
        for pr_data in prs_data:
            existing = await db.execute(
                select(PullRequest).where(
                    PullRequest.repo_id == repo.id,
                    PullRequest.github_pr_id == pr_data["id"],
                )
            )
            pr = existing.scalar_one_or_none()
            if not pr:
                pr = PullRequest(
                    repo_id=repo.id,
                    github_pr_id=pr_data["id"],
                    number=pr_data["number"],
                    title=pr_data.get("title"),
                    body=pr_data.get("body"),
                    state=pr_data.get("state"),
                    author_login=pr_data.get("user", {}).get("login"),
                    base_branch=pr_data.get("base", {}).get("ref"),
                    head_branch=pr_data.get("head", {}).get("ref"),
                    merged_at=_parse_dt(pr_data.get("merged_at")),
                    closed_at=_parse_dt(pr_data.get("closed_at")),
                )
                db.add(pr)
                stats["pull_requests"] += 1
        await db.flush()
    except Exception as e:
        logger.error("PR sync failed: %s", e)
        stats["errors"].append(f"PR sync: {e}")

    repo.last_synced_at = datetime.now(timezone.utc)
    await db.flush()

    return stats


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None

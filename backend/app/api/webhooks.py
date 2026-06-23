import logging
from datetime import datetime

from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_github_webhook_signature
from app.models.repository import Repository
from app.models.user import User
from app.services import commit_service
from app.dependencies import DB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
):
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")

    if not verify_github_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event_type == "push":
        background_tasks.add_task(_handle_push_event, data)
    elif event_type == "pull_request":
        background_tasks.add_task(_handle_pr_event, data)
    elif event_type == "ping":
        logger.info("Webhook ping received for repo: %s", data.get("repository", {}).get("full_name"))
    else:
        logger.debug("Unhandled webhook event: %s", event_type)

    return {"status": "accepted"}


async def _handle_push_event(data: dict) -> None:
    repo_gh_id = data.get("repository", {}).get("id")
    if not repo_gh_id:
        return

    ref = data.get("ref", "")
    branch = ref.replace("refs/heads/", "")

    async for db in get_db():
        try:
            result = await db.execute(
                select(Repository).where(Repository.github_repo_id == repo_gh_id)
            )
            repo = result.scalar_one_or_none()
            if not repo:
                return

            user_result = await db.execute(select(User).where(User.id == repo.user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                return

            for commit_data in data.get("commits", []):
                sha = commit_data.get("id")
                if not sha:
                    continue

                author = commit_data.get("author", {})
                committed_dt = _parse_dt(commit_data.get("timestamp"))

                commit = await commit_service.store_commit_from_webhook(
                    db=db,
                    repo_id=repo.id,
                    sha=sha,
                    author_name=author.get("name", ""),
                    author_email=author.get("email", ""),
                    author_login=author.get("username"),
                    message=commit_data.get("message", ""),
                    committed_at=committed_dt or datetime.utcnow(),
                    branch=branch,
                )

                await commit_service.analyze_and_embed_commit(
                    db=db,
                    commit=commit,
                    repo=repo,
                    access_token=user.github_token,
                )

            await db.commit()
            logger.info("Processed push event for %s (branch: %s)", repo.full_name, branch)

        except Exception as e:
            logger.error("Failed to handle push event: %s", e)
            await db.rollback()


async def _handle_pr_event(data: dict) -> None:
    action = data.get("action")
    if action not in ("opened", "closed", "reopened", "synchronize"):
        return

    repo_gh_id = data.get("repository", {}).get("id")
    pr_data = data.get("pull_request", {})

    async for db in get_db():
        try:
            result = await db.execute(
                select(Repository).where(Repository.github_repo_id == repo_gh_id)
            )
            repo = result.scalar_one_or_none()
            if not repo:
                return

            from app.models.pull_request import PullRequest
            from app.services.pr_service import analyze_and_embed_pr

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
                await db.flush()
                await analyze_and_embed_pr(db, pr, repo)

            await db.commit()

        except Exception as e:
            logger.error("Failed to handle PR event: %s", e)
            await db.rollback()


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None

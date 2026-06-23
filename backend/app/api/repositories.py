from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.repository import Repository
from app.models.commit import Commit
from app.schemas.repository import RepositoryResponse, RepositoryCreate, RepositoryStats
from app.services import github_service, sync_service
from app.dependencies import CurrentUser, DB

router = APIRouter(prefix="/repos", tags=["repositories"])


@router.get("", response_model=list[RepositoryResponse])
async def list_repositories(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Repository)
        .where(Repository.user_id == current_user.id)
        .order_by(Repository.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/github/available")
async def list_github_repositories(current_user: CurrentUser):
    repos = await github_service.fetch_user_repositories(current_user.github_token)
    return [
        {
            "github_repo_id": r["id"],
            "full_name": r["full_name"],
            "name": r["name"],
            "description": r.get("description"),
            "language": r.get("language"),
            "is_private": r.get("private", False),
            "default_branch": r.get("default_branch", "main"),
            "stargazers_count": r.get("stargazers_count", 0),
            "updated_at": r.get("updated_at"),
        }
        for r in repos
    ]


@router.post("", response_model=RepositoryResponse, status_code=201)
async def connect_repository(
    body: RepositoryCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    # Check already connected
    existing = await db.execute(
        select(Repository).where(Repository.github_repo_id == body.github_repo_id)
    )
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Repository already connected")

    # Fetch repo details from GitHub
    repos = await github_service.fetch_user_repositories(current_user.github_token)
    gh_repo = next((r for r in repos if r["id"] == body.github_repo_id), None)
    if not gh_repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found in your GitHub account")

    repo = Repository(
        user_id=current_user.id,
        github_repo_id=gh_repo["id"],
        full_name=gh_repo["full_name"],
        name=gh_repo["name"],
        description=gh_repo.get("description"),
        default_branch=gh_repo.get("default_branch", "main"),
        language=gh_repo.get("language"),
        is_private=gh_repo.get("private", False),
    )
    db.add(repo)
    await db.flush()

    # Register GitHub webhook
    webhook_url = f"https://api.repomind.dev/api/webhooks/github"  # replace with real URL
    try:
        webhook_id, webhook_secret = await github_service.create_webhook(
            current_user.github_token, repo.full_name, webhook_url
        )
        repo.webhook_id = webhook_id
        repo.webhook_secret = webhook_secret
    except Exception:
        pass  # Webhook registration is best-effort

    # Kick off initial sync in background
    background_tasks.add_task(sync_service.sync_repository_task, repo.id, current_user.id)

    return repo


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Repository).where(
            Repository.id == repo_id,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.get("/{repo_id}/stats", response_model=RepositoryStats)
async def get_repository_stats(repo_id: UUID, current_user: CurrentUser, db: DB):
    from app.models.pull_request import PullRequest
    from app.models.branch import Branch

    total_commits = (await db.execute(
        select(func.count()).select_from(Commit).where(Commit.repo_id == repo_id)
    )).scalar_one()
    analyzed_commits = (await db.execute(
        select(func.count()).select_from(Commit).where(
            Commit.repo_id == repo_id, Commit.ai_summary.isnot(None)
        )
    )).scalar_one()
    total_prs = (await db.execute(
        select(func.count()).select_from(PullRequest).where(PullRequest.repo_id == repo_id)
    )).scalar_one()
    total_branches = (await db.execute(
        select(func.count()).select_from(Branch).where(Branch.repo_id == repo_id)
    )).scalar_one()

    return RepositoryStats(
        total_commits=total_commits,
        total_prs=total_prs,
        total_branches=total_branches,
        analyzed_commits=analyzed_commits,
    )


@router.post("/{repo_id}/sync")
async def sync_repository(
    repo_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    result = await db.execute(
        select(Repository).where(
            Repository.id == repo_id,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    background_tasks.add_task(sync_service.sync_repository_task, repo.id, current_user.id)
    return {"message": "Sync started"}


@router.post("/{repo_id}/analyze-history")
async def analyze_history(
    repo_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    result = await db.execute(
        select(Repository).where(
            Repository.id == repo_id,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    total = (await db.execute(
        select(func.count()).select_from(Commit).where(
            Commit.repo_id == repo_id,
            Commit.ai_analyzed_at.is_(None),
        )
    )).scalar_one()

    if total == 0:
        return {"message": "All commits already analyzed", "total": 0}

    from app.services.commit_service import analyze_commits_batch
    background_tasks.add_task(analyze_commits_batch, repo_id, current_user.github_token)
    return {"message": "Analysis started", "total": total}


@router.delete("/{repo_id}", status_code=204)
async def disconnect_repository(repo_id: UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Repository).where(
            Repository.id == repo_id,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.webhook_id:
        try:
            await github_service.delete_webhook(
                current_user.github_token, repo.full_name, repo.webhook_id
            )
        except Exception:
            pass

    await db.delete(repo)

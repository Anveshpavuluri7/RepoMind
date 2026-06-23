from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.commit import Commit
from app.models.repository import Repository
from app.schemas.commit import CommitResponse, CommitListResponse
from app.services import commit_service
from app.dependencies import CurrentUser, DB

router = APIRouter(tags=["commits"])


@router.get("/repos/{repo_id}/commits", response_model=CommitListResponse)
async def list_commits(
    repo_id: UUID,
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    commits, total = await commit_service.get_commits_for_repo(db, repo_id, page, page_size)
    return CommitListResponse(
        items=[CommitResponse.from_orm_with_analysis(c) for c in commits],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/commits/{commit_id}", response_model=CommitResponse)
async def get_commit(commit_id: UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(select(Commit).where(Commit.id == commit_id))
    commit = result.scalar_one_or_none()
    if not commit:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Commit not found")
    return CommitResponse.from_orm_with_analysis(commit)


@router.post("/commits/{commit_id}/analyze")
async def reanalyze_commit(
    commit_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    result = await db.execute(select(Commit).where(Commit.id == commit_id))
    commit = result.scalar_one_or_none()
    if not commit:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Commit not found")

    repo_result = await db.execute(
        select(Repository).where(Repository.id == commit.repo_id)
    )
    repo = repo_result.scalar_one_or_none()

    background_tasks.add_task(
        commit_service.analyze_and_embed_commit,
        db,
        commit,
        repo,
        current_user.github_token,
    )
    return {"message": "Analysis started"}

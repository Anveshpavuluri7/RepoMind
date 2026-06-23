from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, union_all, literal

from app.models.commit import Commit
from app.models.pull_request import PullRequest
from app.schemas.timeline import TimelineEvent, TimelineResponse
from app.dependencies import CurrentUser, DB

router = APIRouter(tags=["timeline"])


@router.get("/repos/{repo_id}/timeline", response_model=TimelineResponse)
async def get_timeline(
    repo_id: UUID,
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(default=50, ge=1, le=200),
):
    # Fetch commits
    commits_q = await db.execute(
        select(Commit)
        .where(Commit.repo_id == repo_id)
        .order_by(Commit.committed_at.desc())
        .limit(limit)
    )
    commits = commits_q.scalars().all()

    # Fetch PRs
    prs_q = await db.execute(
        select(PullRequest)
        .where(PullRequest.repo_id == repo_id)
        .order_by(PullRequest.created_at.desc())
        .limit(limit)
    )
    prs = prs_q.scalars().all()

    events: list[TimelineEvent] = []

    for c in commits:
        events.append(TimelineEvent(
            id=c.id,
            type="commit",
            timestamp=c.committed_at or c.created_at,
            title=_short_message(c.message),
            author=c.author_login or c.author_name,
            branch=c.branch,
            ai_summary=c.ai_summary,
            risk_level=c.ai_risk_level,
            sha=c.sha,
            files_changed=c.files_changed,
        ))

    for pr in prs:
        events.append(TimelineEvent(
            id=pr.id,
            type="pull_request",
            timestamp=pr.merged_at or pr.closed_at or pr.created_at,
            title=pr.title or f"PR #{pr.number}",
            author=pr.author_login,
            branch=pr.head_branch,
            ai_summary=pr.ai_summary,
            risk_level=pr.ai_risk_level,
            pr_number=pr.number,
        ))

    events.sort(key=lambda e: e.timestamp, reverse=True)
    events = events[:limit]

    return TimelineResponse(events=events, total=len(events))


def _short_message(message: str | None) -> str:
    if not message:
        return "No message"
    return message.split("\n")[0][:80]

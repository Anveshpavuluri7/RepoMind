import logging
import secrets
import httpx
from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.core.exceptions import GitHubAPIError

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"


@dataclass
class GitHubUser:
    id: int
    login: str
    name: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]
    access_token: str


@dataclass
class GitHubCommitDetail:
    sha: str
    message: str
    author_name: str
    author_email: str
    author_login: Optional[str]
    committed_at: str
    files_changed: int
    additions: int
    deletions: int
    diff: str


async def exchange_code_for_token(code: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
        )
    if resp.status_code != 200:
        raise GitHubAPIError("Failed to exchange OAuth code for token")
    data = resp.json()
    if "error" in data:
        raise GitHubAPIError(data.get("error_description", data["error"]))
    return data["access_token"]


async def fetch_github_user(access_token: str) -> GitHubUser:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        user_resp = await client.get(f"{GITHUB_API_BASE}/user", headers=headers)
        if user_resp.status_code != 200:
            raise GitHubAPIError("Failed to fetch GitHub user profile")
        user_data = user_resp.json()

        # Fetch primary email if not in profile
        email = user_data.get("email")
        if not email:
            emails_resp = await client.get(f"{GITHUB_API_BASE}/user/emails", headers=headers)
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = primary["email"] if primary else None

    return GitHubUser(
        id=user_data["id"],
        login=user_data["login"],
        name=user_data.get("name"),
        email=email,
        avatar_url=user_data.get("avatar_url"),
        access_token=access_token,
    )


async def fetch_user_repositories(access_token: str) -> list[dict]:
    repos = []
    page = 1
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        while True:
            resp = await client.get(
                f"{GITHUB_API_BASE}/user/repos",
                headers=headers,
                params={"per_page": 100, "page": page, "sort": "updated"},
            )
            if resp.status_code != 200:
                break
            batch = resp.json()
            if not batch:
                break
            repos.extend(batch)
            page += 1
    return repos


async def fetch_commit_detail(
    access_token: str,
    full_name: str,
    sha: str,
) -> GitHubCommitDetail:
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github.v3.diff",
        }
        diff_resp = await client.get(
            f"{GITHUB_API_BASE}/repos/{full_name}/commits/{sha}",
            headers=headers,
        )
        diff_content = diff_resp.text if diff_resp.status_code == 200 else ""

        headers["Accept"] = "application/json"
        json_resp = await client.get(
            f"{GITHUB_API_BASE}/repos/{full_name}/commits/{sha}",
            headers=headers,
        )

    if json_resp.status_code != 200:
        raise GitHubAPIError(f"Failed to fetch commit {sha}")

    data = json_resp.json()
    commit = data.get("commit", {})
    stats = data.get("stats", {})
    files = data.get("files", [])

    return GitHubCommitDetail(
        sha=data["sha"],
        message=commit.get("message", ""),
        author_name=commit.get("author", {}).get("name", ""),
        author_email=commit.get("author", {}).get("email", ""),
        author_login=data.get("author", {}).get("login") if data.get("author") else None,
        committed_at=commit.get("author", {}).get("date", ""),
        files_changed=len(files),
        additions=stats.get("additions", 0),
        deletions=stats.get("deletions", 0),
        diff=diff_content,
    )


async def fetch_repository_commits(
    access_token: str,
    full_name: str,
    branch: str,
    per_page: int = 30,
) -> list[dict]:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        resp = await client.get(
            f"{GITHUB_API_BASE}/repos/{full_name}/commits",
            headers=headers,
            params={"sha": branch, "per_page": per_page},
        )
    if resp.status_code != 200:
        raise GitHubAPIError(f"Failed to fetch commits for {full_name}")
    return resp.json()


async def fetch_repository_branches(access_token: str, full_name: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        resp = await client.get(
            f"{GITHUB_API_BASE}/repos/{full_name}/branches",
            headers=headers,
            params={"per_page": 100},
        )
    if resp.status_code != 200:
        raise GitHubAPIError(f"Failed to fetch branches for {full_name}")
    return resp.json()


async def fetch_pull_requests(
    access_token: str,
    full_name: str,
    state: str = "all",
    per_page: int = 30,
) -> list[dict]:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        resp = await client.get(
            f"{GITHUB_API_BASE}/repos/{full_name}/pulls",
            headers=headers,
            params={"state": state, "per_page": per_page},
        )
    if resp.status_code != 200:
        raise GitHubAPIError(f"Failed to fetch PRs for {full_name}")
    return resp.json()


async def create_webhook(
    access_token: str,
    full_name: str,
    webhook_url: str,
) -> tuple[int, str]:
    webhook_secret = secrets.token_hex(32)
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        resp = await client.post(
            f"{GITHUB_API_BASE}/repos/{full_name}/hooks",
            headers=headers,
            json={
                "name": "web",
                "active": True,
                "events": ["push", "pull_request", "create", "delete"],
                "config": {
                    "url": webhook_url,
                    "content_type": "json",
                    "secret": webhook_secret,
                },
            },
        )
    if resp.status_code not in (200, 201):
        raise GitHubAPIError(f"Failed to create webhook: {resp.text}")
    return resp.json()["id"], webhook_secret


async def delete_webhook(
    access_token: str,
    full_name: str,
    webhook_id: int,
) -> None:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}"}
        await client.delete(
            f"{GITHUB_API_BASE}/repos/{full_name}/hooks/{webhook_id}",
            headers=headers,
        )

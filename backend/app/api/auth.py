from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import create_access_token
from app.config import settings
from app.models.user import User
from app.services import github_service
from app.dependencies import CurrentUser
from app.schemas.user import UserMe

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/github")
async def github_login():
    return RedirectResponse(url=settings.github_oauth_url)


@router.get("/callback")
async def github_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    access_token = await github_service.exchange_code_for_token(code)
    github_user = await github_service.fetch_github_user(access_token)

    # Upsert user
    result = await db.execute(select(User).where(User.github_id == github_user.id))
    user = result.scalar_one_or_none()

    if user:
        user.github_token = access_token
        user.name = github_user.name
        user.email = github_user.email
        user.avatar_url = github_user.avatar_url
    else:
        user = User(
            github_id=github_user.id,
            github_login=github_user.login,
            github_token=access_token,
            name=github_user.name,
            email=github_user.email,
            avatar_url=github_user.avatar_url,
        )
        db.add(user)

    await db.flush()

    jwt_token = create_access_token(str(user.id))
    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard")
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.jwt_expire_minutes * 60,
    )
    return response


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserMe)
async def get_me(current_user: CurrentUser):
    return current_user

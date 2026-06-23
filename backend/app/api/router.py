from fastapi import APIRouter
from app.api import auth, repositories, commits, timeline, chat, webhooks

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(repositories.router)
api_router.include_router(commits.router)
api_router.include_router(timeline.router)
api_router.include_router(chat.router)
api_router.include_router(webhooks.router)

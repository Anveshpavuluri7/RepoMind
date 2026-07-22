from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import engine, Base
from app.core.exceptions import RepoMindException, repomind_exception_handler
from app.api.router import api_router

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ready")
    except Exception as e:
        logger.warning("Could not run create_all at startup (tables may already exist): %s", e)
    logger.info("RepoMind backend started — env: %s", settings.app_env)
    yield
    await engine.dispose()
    logger.info("RepoMind backend shutdown")


app = FastAPI(
    title="RepoMind API",
    description="AI-powered repository intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RepoMindException, repomind_exception_handler)
app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}

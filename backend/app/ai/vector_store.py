import asyncio
import logging
import chromadb
from langchain_chroma import Chroma
from langchain.schema import Document

from app.config import settings
from app.ai.embeddings import get_embedding_model

logger = logging.getLogger(__name__)

# Cache the embedding model so it's only loaded once
_embedding_model = None


def _load_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading HuggingFace embedding model (first time may take a minute)...")
        _embedding_model = get_embedding_model()
        logger.info("Embedding model loaded.")
    return _embedding_model


async def get_cached_embedding_model():
    """Load the embedding model in a thread pool so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _load_embedding_model)


def get_chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
    )


async def get_vector_store(repo_id: str) -> Chroma:
    """Get a per-repository ChromaDB vector store."""
    collection_name = f"{settings.chroma_collection_prefix}_{repo_id.replace('-', '_')}"
    model = await get_cached_embedding_model()
    return Chroma(
        collection_name=collection_name,
        embedding_function=model,
        client=get_chroma_client(),
    )


async def upsert_commit_embedding(repo_id: str, commit_id: str, document: str, metadata: dict) -> None:
    try:
        store = await get_vector_store(repo_id)
        doc = Document(
            page_content=document,
            metadata={**metadata, "type": "commit", "commit_id": commit_id},
        )
        store.add_documents([doc], ids=[f"commit_{commit_id}"])
    except Exception as e:
        logger.warning("ChromaDB upsert failed for commit %s: %s — skipping embedding", commit_id[:8], e)


async def upsert_pr_embedding(repo_id: str, pr_id: str, document: str, metadata: dict) -> None:
    try:
        store = await get_vector_store(repo_id)
        doc = Document(
            page_content=document,
            metadata={**metadata, "type": "pull_request", "pr_id": pr_id},
        )
        store.add_documents([doc], ids=[f"pr_{pr_id}"])
    except Exception as e:
        logger.warning("ChromaDB upsert failed for PR %s: %s — skipping embedding", pr_id[:8], e)


async def similarity_search(repo_id: str, query: str, k: int = 8) -> list[Document]:
    store = await get_vector_store(repo_id)
    return store.similarity_search_with_score(query, k=k)

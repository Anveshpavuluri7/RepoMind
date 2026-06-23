from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    secret_key: str
    debug: bool = False

    # Database
    database_url: str
    database_url_sync: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # GitHub OAuth
    github_client_id: str
    github_client_secret: str
    github_webhook_secret: str

    # Anthropic
    anthropic_api_key: str
    anthropic_model: str = "claude-opus-4-8"

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection_prefix: str = "repomind"

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def github_oauth_url(self) -> str:
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={self.github_client_id}"
            f"&scope=repo,read:user,user:email"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

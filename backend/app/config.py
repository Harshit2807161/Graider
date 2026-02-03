"""Configuration management for Gr8r backend."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    anthropic_api_key: str = "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"

    # Claude Models
    claude_orchestrator_model: str = "claude-sonnet-4-20250514"
    claude_grader_model: str = "claude-sonnet-4-20250514"
    claude_vision_model: str = "claude-sonnet-4-20250514"

    # Database
    database_url: str = "sqlite:///./data/gr8r.db"

    # Storage paths
    upload_dir: Path = Path("./data/uploads")
    output_dir: Path = Path("./data/outputs")

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    def ensure_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

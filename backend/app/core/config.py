from typing import List, Union
from pathlib import Path
from functools import lru_cache
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Graider"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5433/graider"
    
    # Message Broker
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str # Must be set in .env or environment variable
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
    # External APIs
    ANTHROPIC_API_KEY: str = "sk-ant-api03-placeholder"
    OPENAI_API_KEY: str = "sk-placeholder"
    
    # LLM Provider: "openai" or "anthropic"
    LLM_PROVIDER: str = "openai"
    
    # Storage
    UPLOAD_DIR: Path = Path("./data/uploads")
    OUTPUT_DIR: Path = Path("./data/outputs")

    # LLM Models (provider-agnostic names)
    LLM_GRADER_MODEL: str = "gpt-5-nano-2025-08-07"
    LLM_ORCHESTRATOR_MODEL: str = "gpt-5-nano-2025-08-07"
    LLM_VISION_MODEL: str = "gpt-5-nano-2025-08-07"

    def ensure_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

    class Config:
        case_sensitive = True
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

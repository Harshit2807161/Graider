import os
from typing import Annotated, List, Optional, Union
from pathlib import Path
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None if os.environ.get("GR8R_IGNORE_ENV_FILE") else ".env", case_sensitive=True, extra="ignore")

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Graider"

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5433/graider"
    SQL_ECHO: bool = False

    # Message Broker
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str # Must be set in .env or environment variable
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"

    # Bootstrap superuser (used by `python -m app.initial_data`)
    FIRST_SUPERUSER_EMAIL: Optional[str] = None
    FIRST_SUPERUSER_PASSWORD: Optional[str] = None

    # Provider API keys. Which models each role uses is configured with LLM__* settings
    # (app/llm/config.py); keys are looked up by name from here or the environment.
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENWEIGHT_API_KEY: Optional[str] = None  # only if your vLLM/SGLang server requires a key

    # Deployed code version (e.g. git SHA), recorded on every grading run for audit
    CODE_VERSION: Optional[str] = None

    # Grading v2 (Proposal 002 §7)
    GRADING_AGREEMENT_THRESHOLD: float = 0.8  # effective agreement needed to finalize a grade
    GRADING_MAX_REVISIONS: int = 2  # grader revisions before escalating a disagreement
    GRADING_CRITERION_TOLERANCE: float = 0.25  # per-criterion gap allowed, as a share of its points
    GRADING_OCR_CONFIDENCE_THRESHOLD: float = 0.5  # lower transcription confidence escalates
    GRADING_SPOT_CHECK_RATE: float = 0.0  # share of graded answers sent to the teacher anyway
    GRADING_MAX_CONCURRENCY: int = 4  # pages read / questions graded in parallel

    # Optional Langfuse tracing (engineering observability, not the audit record). On only when
    # all three are set; see docs/observability.md
    LANGFUSE_BASE_URL: Optional[str] = None
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None

    # Storage
    UPLOAD_DIR: Path = Path("./data/uploads")
    OUTPUT_DIR: Path = Path("./data/outputs")
    MAX_UPLOAD_SIZE_MB: int = 50  # per file

    # Document intake (app/ingestion): every file becomes page images (+ text layer when digital)
    INGEST_DPI: int = 200  # ~ the most detail Claude uses for an A4 page
    INGEST_MAX_LONG_EDGE: int = 2576  # px; Claude's high-resolution cap
    MAX_PAGES_PER_DOCUMENT: int = 100
    MAX_PAGES_PER_SUBMISSION: int = 150
    MAX_FILES_PER_SUBMISSION: int = 30
    MAX_IMAGE_PIXELS: int = 100_000_000  # larger images are rejected (decompression-bomb guard)
    # Sandboxed LibreOffice converter for DOCX/DOC/ODT/RTF/PPTX; office uploads are refused without it
    GOTENBERG_URL: Optional[str] = None
    GOTENBERG_TIMEOUT_S: float = 90.0

    def ensure_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # CORS. Accepts a JSON list or a comma-separated string.
    BACKEND_CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

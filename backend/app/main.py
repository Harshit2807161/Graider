"""FastAPI entry point for Gr8r backend."""

import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings

# Set up file and console logging
def setup_logging():
    """Configure logging to both file and console."""
    settings = get_settings()

    # Create logs directory
    log_dir = Path(settings.upload_dir).parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "gr8r.log"

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler (human-readable)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # File handler (JSON for parsing)
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)  # Capture all levels to file
    root_logger.addHandler(file_handler)

    return log_file

log_file_path = setup_logging()

# Configure structlog to use stdlib logging (which now writes to file + console)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

from .api.routes import upload, grade, status, results

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    settings.ensure_directories()
    if not settings.anthropic_api_key:
        logger.warning(
            "anthropic_api_key_missing",
            message="ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.",
        )
    logger.info("gr8r_startup", message="Gr8r backend starting up", log_file=str(log_file_path))
    print(f"\n📋 Logs are being saved to: {log_file_path}\n")
    yield
    logger.info("gr8r_shutdown", message="Gr8r backend shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Gr8r API",
        description="AI-powered grading system using Claude Vision and multi-agent orchestration",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(upload.router, prefix="/api", tags=["upload"])
    app.include_router(grade.router, prefix="/api", tags=["grading"])
    app.include_router(status.router, prefix="/api", tags=["status"])
    app.include_router(results.router, prefix="/api", tags=["results"])

    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "name": "Gr8r API",
            "version": "0.1.0",
            "status": "running",
            "docs": "/docs"
        }

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy"}

    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )

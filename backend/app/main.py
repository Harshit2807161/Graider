"""FastAPI entry point for Gr8r backend."""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .api.routes import upload, grade, status, results

# Configure structured logging
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

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    settings.ensure_directories()
    logger.info("gr8r_startup", message="Gr8r backend starting up")
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

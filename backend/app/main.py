from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
import time
import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from app.workflow.actions import InvalidScores
from app.workflow.state import WorkflowError

logger = structlog.get_logger(__name__)


# The schema is managed by Alembic (`alembic upgrade head`, run by `python -m app.initial_data`
# or the compose `migrate` service), not created at startup.
app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        "api_request",
        method=request.method,
        path=request.url.path,
        duration=f"{duration:.4f}s",
        status_code=response.status_code
    )
    return response

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(WorkflowError)
async def workflow_conflict(request: Request, exc: WorkflowError) -> JSONResponse:
    """An action the submission's current state doesn't allow, or a stale grade."""
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(InvalidScores)
async def invalid_scores(request: Request, exc: InvalidScores) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": exc.errors})


@app.get("/health")
def health_check():
    return {"status": "ok"}

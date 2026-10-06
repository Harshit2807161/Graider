import asyncio
from uuid import UUID
from celery import Celery
from celery.signals import worker_process_shutdown, worker_shutdown
from app.core.config import get_settings
from app.observability.tracing import ensure_tracing, shutdown_tracing
from app.services.grading_service import run_grading

settings = get_settings()

celery_app = Celery(
    "graider_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Re-deliver a task if the worker dies mid-run instead of losing it
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Redis redelivers unacknowledged tasks after this many seconds; it must exceed the task's
    # hard time limit or a long run would be handed to a second worker while still running
    broker_transport_options={"visibility_timeout": 2 * 60 * 60},
)

# One event loop per worker process, reused by every task (like uvicorn's single loop).
# Async HTTP clients (e.g. the ones LangChain caches per process) are bound to the loop that
# created them, so a fresh asyncio.run() per task breaks them on the next task
# ("Event loop is closed").
_loop: asyncio.AbstractEventLoop | None = None


def run_in_worker_loop(coro):
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_loop)
    return _loop.run_until_complete(coro)


@celery_app.task(name="grade_submission_task", soft_time_limit=30 * 60, time_limit=35 * 60)
def grade_submission_task(run_id: str):
    """Execute one grading run. Safe to redeliver: finished runs are skipped."""
    ensure_tracing()  # per worker process, after fork; no-op unless MLFLOW_TRACKING_URI is set
    run_in_worker_loop(run_grading(UUID(run_id)))


@worker_process_shutdown.connect
@worker_shutdown.connect
def _flush_traces(**_):
    shutdown_tracing()

if __name__ == "__main__":
    celery_app.start()

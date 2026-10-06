import asyncio
from uuid import UUID
from celery import Celery
from app.core.config import get_settings
from app.services.grading_service import run_grading_pipeline

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


@celery_app.task(name="grade_exam_task", soft_time_limit=30 * 60, time_limit=35 * 60)
def grade_exam_task(submission_id: str, answers_path: str):
    """Celery background task to grade an exam submission asynchronously."""
    run_in_worker_loop(run_grading_pipeline(
        submission_id=UUID(submission_id),
        answers_path=answers_path,
    ))

if __name__ == "__main__":
    celery_app.start()

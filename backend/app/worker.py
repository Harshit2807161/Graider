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
)

@celery_app.task(name="grade_exam_task")
def grade_exam_task(submission_id: str, answers_path: str):
    """Celery background task to grade an exam submission asynchronously."""
    asyncio.run(run_grading_pipeline(
        submission_id=UUID(submission_id),
        questions_path=None,  # Bypass OCR extractor, use DB instead
        answers_path=answers_path,
    ))

if __name__ == "__main__":
    celery_app.start()

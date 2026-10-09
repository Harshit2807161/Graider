"""Grading run lifecycle: queued (API) → running (worker) → succeeded | failed.

The run id is the idempotency key: a Celery redelivery of a finished run does nothing.
The config snapshot is taken in the worker at start, because the worker's settings decide
which models are actually used.
"""

import hashlib
import json
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.llm.config import get_llm_settings
from app.models.audit import GradingRun, LLMCall, RunStatus
from app.models.base import utcnow

# Status only moves forward. "running" → "running" covers a redelivered task after a worker crash.
_ALLOWED = {
    RunStatus.QUEUED: {RunStatus.RUNNING, RunStatus.FAILED},
    RunStatus.RUNNING: {RunStatus.RUNNING, RunStatus.SUCCEEDED, RunStatus.FAILED},
}


class InvalidRunTransition(RuntimeError):
    pass


def _transition(run: GradingRun, to: str) -> None:
    if to not in _ALLOWED.get(run.status, set()):
        raise InvalidRunTransition(f"grading run {run.id}: {run.status} → {to} is not allowed")
    run.status = to


def config_snapshot(exam_config: Optional[dict] = None) -> tuple[dict, str]:
    """The model configuration this worker will use, with the grading settings (the exam's own where
    it sets them), and a short hash of it. Holds no secrets (API keys live in app settings, not in
    LLM settings)."""
    from app.core.config import settings
    from app.exam_drafts.extract import PROMPT_VERSION as EXAM_PAGE_PROMPT
    from app.grading.prompts import PROMPT_VERSION as GRADING_PROMPT
    from app.grading.question import ExamSettings
    from app.rubrics.parser import PARSER_PROMPT_VERSION

    snapshot = get_llm_settings().model_dump(mode="json")
    exam = ExamSettings.of(exam_config)
    snapshot["grading"] = {
        "agreement_threshold": exam.agreement_threshold,
        "max_revisions": settings.GRADING_MAX_REVISIONS,
        "criterion_tolerance": settings.GRADING_CRITERION_TOLERANCE,
        "ocr_confidence_threshold": settings.GRADING_OCR_CONFIDENCE_THRESHOLD,
        "spot_check_rate": exam.spot_check_rate,
    }
    snapshot["prompt_versions"] = {
        "grading": GRADING_PROMPT, "rubric_parser": PARSER_PROMPT_VERSION, "exam_page": EXAM_PAGE_PROMPT,
    }
    digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()[:16]
    return snapshot, digest


def create_run(
    db: Session,
    *,
    submission_id: UUID,
    trigger: str,
    created_by_membership_id: Optional[UUID] = None,
    question_ids: Optional[list[UUID]] = None,
) -> GradingRun:
    """A queued grading run; `question_ids` limits it to those questions (e.g. a transcript edit)."""
    run = GradingRun(
        submission_id=submission_id, trigger=trigger, created_by_membership_id=created_by_membership_id,
        question_ids=[str(q) for q in question_ids] if question_ids else None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def start_run(db: Session, run: GradingRun, exam_config: Optional[dict] = None) -> None:
    _transition(run, RunStatus.RUNNING)
    run.config_snapshot, run.config_hash = config_snapshot(exam_config)
    run.code_version = settings.CODE_VERSION
    run.started_at = run.started_at or utcnow()
    db.add(run)
    db.commit()


def set_trace_id(db: Session, run: GradingRun, trace_id: Optional[str]) -> None:
    if trace_id:
        run.trace_id = trace_id
        db.add(run)
        db.commit()


def finish_run(db: Session, run: GradingRun, error: Optional[str] = None) -> None:
    calls, cost = db.exec(
        select(func.count(LLMCall.id), func.coalesce(func.sum(LLMCall.cost_usd), 0.0)).where(LLMCall.run_id == run.id)
    ).one()
    _transition(run, RunStatus.FAILED if error else RunStatus.SUCCEEDED)
    run.error = error[:2000] if error else None
    run.llm_calls = calls
    run.cost_usd = float(cost)
    run.finished_at = utcnow()
    db.add(run)
    db.commit()

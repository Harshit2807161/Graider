"""Grading pipeline: one grading run (the unit of audit) per upload, regrade or transcript edit."""

from pathlib import Path
from typing import Optional
from uuid import UUID

import structlog
from sqlmodel import Session

from app import crud
from app.audit.recorder import DbCallRecorder
from app.audit.runs import finish_run, set_trace_id, start_run
from app.core.constants import SubmissionStatus
from app.core.db import engine
from app.grading import persist
from app.grading.graph import QuestionInfo, run_submission_graph
from app.grading.question import ExamSettings, QuestionInput, grade_question
from app.grading.stitch import StitchedAnswer
from app.grading.transcribe import SheetPage
from app.ingestion.pages import DocumentError
from app.ingestion.service import submission_pages
from app.llm.budget import LLMBudgetExceeded, budget
from app.llm.config import get_llm_settings
from app.llm.recorder import recording_to
from app.llm.router import run_router
from app.llm.types import LLMError
from app.models.audit import GradingRun, RunStatus
from app.models.exam import Exam, Question, Submission
from app.models.grading import Source, Transcription
from app.models.rubric import RubricStatus
from app.observability.tracing import run_trace
from app.rubrics.schema import RubricSpec
from app.rubrics.service import ensure_rubric_specs

from .labels import choice_groups, exam_labels

logger = structlog.get_logger(__name__)


def _set_progress(db: Session, submission: Submission, step: str, **fields) -> None:
    crud.submission.update(db, db_obj=submission, obj_in={"current_step": step, **fields})


def _pages(db: Session, submission: Submission) -> list[SheetPage]:
    try:
        rows = submission_pages(db, submission)
    except DocumentError as e:
        raise ValueError(f"The answer sheet can't be read: {e}") from e
    return [SheetPage(number=i, image_path=Path(p.image_path) if p.image_path else None, text_layer=p.text_layer)
            for i, p in enumerate(rows, start=1)]


async def run_grading(run_id: UUID) -> None:
    """
    Execute one grading run: read the submission's pages, stitch each question's answer, grade every
    question against its rubric spec (evaluator loop, escalation), and save new transcription and
    grade versions with the submission's totals. Every model call is recorded in `llm_calls`.

    A run scoped to some questions (e.g. after a teacher corrected a transcript) regrades only those,
    from their current transcriptions. Idempotent: a redelivered task for a finished run does nothing.
    The run fails only if the pages can't be read, the budget runs out, or the exam has no questions;
    other problems escalate the question concerned (status NEEDS_REVIEW).
    """
    llm_settings = get_llm_settings()
    with Session(engine) as db:
        run = db.get(GradingRun, run_id)
        if run is None:
            logger.error("grading_run_not_found", run_id=str(run_id))
            return
        if run.status in RunStatus.TERMINAL:
            logger.info("grading_run_already_finished", run_id=str(run_id), status=run.status)
            return
        submission = crud.submission.get(db, id=run.submission_id)
        if not submission:
            finish_run(db, run, error="Submission not found")
            return

        exam = db.get(Exam, submission.exam_id)
        start_run(db, run, exam_config=exam.config if exam else None)
        error: Optional[str] = None
        try:
            questions = crud.question.get_by_exam(db, exam_id=submission.exam_id)
            if not questions:
                raise ValueError("This exam has no questions configured.")
            _set_progress(db, submission, "Preparing answer pages...", status=SubmissionStatus.PROCESSING)
            pages = [] if run.question_ids else _pages(db, submission)
            calls = llm_settings.max_calls_for(len(questions)) + 2 * len(pages)
            # One router, one call/cost budget and one audit recorder per grading run
            with run_trace(run.id, submission.id, run.trigger) as trace_id, run_router(), budget(
                calls, llm_settings.max_cost_usd_per_submission
            ), recording_to(DbCallRecorder(run.id, submission.id)) as recorder:
                set_trace_id(db, run, trace_id)
                await _grade(db, submission, run, questions, pages, recorder)
        except Exception as e:
            error = str(e)
            logger.exception("pipeline_error", run_id=str(run_id), submission_id=str(submission.id), error=error)
            # A failed flush/commit leaves the session unusable until rolled back
            db.rollback()
            try:
                submission = crud.submission.get(db, id=run.submission_id)
                crud.submission.update(
                    db, db_obj=submission,
                    obj_in={"status": SubmissionStatus.FAILED, "current_step": f"Error: {error[:400]}"},
                )
            except Exception:
                logger.exception("failed_to_update_submission_status", submission_id=str(run.submission_id))

        db.refresh(run)
        finish_run(db, run, error=error)


async def _grade(db: Session, submission: Submission, run: GradingRun, questions: list[Question],
                 pages: list[SheetPage], recorder: DbCallRecorder) -> None:
    labelled = list(zip(exam_labels(questions), questions))
    exam = db.get(Exam, submission.exam_id)
    config = (exam.config if exam else None) or {}
    groups = choice_groups(config)
    exam_settings = ExamSettings.of(config)

    # Rubric specs: parsed now if missing; a question without a ready spec escalates (never graded
    # against an unchecked rubric)
    _set_progress(db, submission, "Checking rubrics...")
    records = await ensure_rubric_specs(db, questions, recorder)
    ready = {q.id: r if r is not None and r.status == RubricStatus.READY else None for q in questions
             for r in [records.get(q.id)]}
    infos = [QuestionInfo(question_id=q.id, label=label, text=q.question_text, max_score=q.max_score,
                          spec=RubricSpec.model_validate(ready[q.id].spec) if ready[q.id] else None)  # type: ignore[union-attr]
             for label, q in labelled]

    if run.question_ids:
        scope = {UUID(i) for i in run.question_ids}
        transcripts = persist.current(db, Transcription, submission.id)
        _set_progress(db, submission, f"Regrading {len(scope)} question(s)...")
        outcomes = []
        for info in infos:
            if info["question_id"] not in scope:
                continue
            transcript = transcripts.get(info["question_id"])
            answer = None
            if transcript is not None and transcript.text:  # type: ignore[attr-defined]
                confidence = 1.0 if transcript.source == Source.TEACHER else (transcript.confidence or 1.0)  # type: ignore[attr-defined]
                answer = StitchedAnswer(info["label"], parts=[transcript.text], starts=1,  # type: ignore[attr-defined]
                                        segments=[{"confidence": confidence, "crossed_out": False}])
            outcomes.append(await grade_question(QuestionInput(
                info["question_id"], info["label"], info["text"], info["max_score"], info["spec"], answer),
                run.id, exam_settings))
        stitched, skip = None, set()
    else:
        _set_progress(db, submission, f"Reading {len(pages)} page(s) for {len(questions)} questions...")
        try:
            state = await run_submission_graph(run.id, pages, infos, groups, exam_settings)
        except LLMBudgetExceeded:
            raise
        except LLMError as e:
            raise ValueError(f"The answer pages couldn't be read: {e}") from e
        stitched, outcomes, skip = state["stitched"], state["outcomes"], state["skip"]

    _set_progress(db, submission, "Saving results...")
    persist.save_results(
        db, submission=submission, run=run, questions=labelled, outcomes=outcomes, specs=ready,
        stitched=stitched, skip=skip, groups=groups, policy=config.get("choice_policy", "best"),
    )
    logger.info("grading_complete", submission_id=str(submission.id), status=submission.status,
                score=f"{submission.total_score}/{submission.max_score}")

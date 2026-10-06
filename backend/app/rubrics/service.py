"""Rubric spec lifecycle: when to parse, storing versions, and the current spec of a question.

- A question's rubric *inputs* are its text, rubric text, max score and type. When they change
  (question sync, Excel import) the question is marked `pending` and `parse_rubric_task`
  parses it in the background. Grading also parses lazily (`ensure_rubric_specs`) any question
  without a spec for its current inputs, so a lost task never blocks grading.
- Every result is a new append-only version in `rubric_specs`; the current spec is the newest
  version for the question's current inputs. A parse whose inputs changed while the model was
  working is discarded (the newer inputs have their own task).
"""

import hashlib
import json
from typing import Any, Optional
from uuid import UUID

import structlog
from sqlmodel import Session, col, select

from app import crud
from app.audit.recorder import DbCallRecorder
from app.core.db import engine
from app.llm.budget import budget
from app.llm.recorder import recording_to
from app.llm.router import run_router
from app.llm.types import LLMError
from app.models.exam import Question
from app.models.rubric import RubricSpecRecord, RubricSpecSource, RubricStatus
from app.observability.tracing import rubric_trace
from app.rubrics.parser import PARSER_PROMPT_VERSION, parse_rubric
from app.rubrics.schema import RubricSpec, RubricSpecEdit
from app.rubrics.validate import has_rubric_text, validate_spec

logger = structlog.get_logger(__name__)

# Limits for one background parse: initial + repair, plus the same on each fallback target
PARSE_MAX_CALLS = 6
PARSE_MAX_COST_USD = 1.0


# ===== inputs and the current spec =====

def rubric_inputs(question: Question) -> dict[str, Any]:
    return {
        "question_text": question.question_text,
        "rubric_text": question.rubric_criteria,
        "max_score": question.max_score,
        "question_type": question.question_type.value,
    }


def rubric_input_hash(question: Question) -> str:
    return hashlib.sha256(json.dumps(rubric_inputs(question), sort_keys=True).encode()).hexdigest()


def current_specs(db: Session, questions: list[Question]) -> dict[UUID, RubricSpecRecord]:
    """The newest spec for each question's current inputs (questions without one are left out)."""
    if not questions:
        return {}
    hashes = {q.id: rubric_input_hash(q) for q in questions}
    rows = db.exec(
        select(RubricSpecRecord)
        .where(col(RubricSpecRecord.question_id).in_(list(hashes)))
        .order_by(col(RubricSpecRecord.version).desc())
    ).all()
    current: dict[UUID, RubricSpecRecord] = {}
    for row in rows:
        if row.question_id not in current and row.input_hash == hashes[row.question_id]:
            current[row.question_id] = row
    return current


def current_spec(db: Session, question: Question) -> Optional[RubricSpecRecord]:
    return current_specs(db, [question]).get(question.id)


def mark_changed(db: Session, questions: list[Question]) -> list[tuple[UUID, str]]:
    """Update the rubric status of questions whose inputs changed. The caller commits, then
    enqueues `parse_rubric_task` for each returned (question id, input hash).

    Inputs that already have a spec (e.g. an edit was undone) reuse it instead of re-parsing.
    """
    changed = [q for q in questions if rubric_input_hash(q) != q.rubric_input_hash]
    existing = current_specs(db, changed)
    to_parse = []
    for question in changed:
        input_hash = rubric_input_hash(question)
        question.rubric_input_hash = input_hash
        question.rubric_error = None
        if question.id in existing:
            question.rubric_status = existing[question.id].status
        else:
            question.rubric_status = RubricStatus.PENDING
            to_parse.append((question.id, input_hash))
        db.add(question)
    return to_parse


def mark_reparse(db: Session, question: Question) -> str:
    """Queue a fresh parse of the current inputs, even if a spec for them exists."""
    input_hash = rubric_input_hash(question)
    question.rubric_input_hash = input_hash
    question.rubric_status = RubricStatus.PENDING
    question.rubric_error = None
    db.add(question)
    return input_hash


# ===== storing versions =====

def _lock_question(db: Session, question_id: UUID) -> Optional[Question]:
    """Re-read a live question from the database, with a row lock (serialises parsers and edits of
    one question)."""
    question = db.exec(
        select(Question)
        .where(Question.id == question_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).first()
    if question is None or question.deleted_at is not None:
        return None
    return question


def _next_version(db: Session, question_id: UUID) -> int:
    versions = db.exec(select(RubricSpecRecord.version).where(RubricSpecRecord.question_id == question_id)).all()
    return max(versions, default=0) + 1


def _store(
    db: Session,
    question: Question,
    spec: RubricSpec,
    errors: list[str],
    *,
    source: str,
    input_hash: str,
    model: Optional[str] = None,
    llm_call_id: Optional[UUID] = None,
    membership_id: Optional[UUID] = None,
) -> RubricSpecRecord:
    record = RubricSpecRecord(
        question_id=question.id,
        version=_next_version(db, question.id),
        source=source,
        status=RubricStatus.INVALID if errors else RubricStatus.READY,
        validation_errors=errors,
        spec=spec.model_dump(mode="json"),
        input_hash=input_hash,
        inputs=rubric_inputs(question),
        parser_prompt_version=PARSER_PROMPT_VERSION if source == RubricSpecSource.AI else None,
        model=model,
        llm_call_id=llm_call_id,
        created_by_membership_id=membership_id,
    )
    db.add(record)
    question.rubric_status = record.status
    question.rubric_input_hash = input_hash
    question.rubric_error = None
    db.add(question)
    db.commit()
    db.refresh(record)
    return record


async def parse_and_store(db: Session, question: Question) -> Optional[RubricSpecRecord]:
    """Parse the question's current inputs and store the result as a new version.

    Runs under the caller's router, budget and recorder. Returns None if parsing failed (the
    question is marked `error`) or the inputs changed meanwhile (result discarded).
    """
    input_hash = rubric_input_hash(question)
    question_id = question.id
    log = logger.bind(question_id=str(question_id))
    try:
        result = await parse_rubric(**rubric_inputs(question))
    except LLMError as e:
        locked = _lock_question(db, question_id)
        if locked is not None and rubric_input_hash(locked) == input_hash:
            # A re-parse that fails leaves an existing spec for these inputs in use
            existing = current_spec(db, locked)
            locked.rubric_status = existing.status if existing else RubricStatus.ERROR
            locked.rubric_input_hash = input_hash
            locked.rubric_error = f"{'Re-parse failed' if existing else 'Parsing failed'}: {e}"[:1000]
            db.add(locked)
        db.commit()
        log.warning("rubric_parse_failed", error=str(e))
        return None

    locked = _lock_question(db, question_id)
    if locked is None or rubric_input_hash(locked) != input_hash:
        db.commit()
        log.info("rubric_parse_discarded", reason="question changed or deleted while parsing")
        return None
    record = _store(
        db, locked, result.spec, result.errors, source=RubricSpecSource.AI, input_hash=input_hash,
        model=result.model, llm_call_id=result.llm_call_id,
    )
    log.info("rubric_parsed", version=record.version, status=record.status, errors=result.errors)
    return record


def store_teacher_spec(
    db: Session, question: Question, edit: RubricSpecEdit, *, membership_id: UUID
) -> tuple[Optional[RubricSpecRecord], list[str]]:
    """Validate a teacher's spec and store it as a new version; returns (record, errors).
    An invalid edit is not stored, so the teacher fixes it in place."""
    spec = RubricSpec(
        kind=edit.kind,
        subject=edit.subject,
        criteria_count=len(edit.criteria),
        criteria=edit.criteria,
        grading_notes=edit.grading_notes,
        derived=not has_rubric_text(question.rubric_criteria),
    )
    errors = validate_spec(spec, max_score=question.max_score, rubric_text=question.rubric_criteria)
    if errors:
        return None, errors
    locked = _lock_question(db, question.id)
    if locked is None:
        return None, ["The question no longer exists."]
    record = _store(
        db, locked, spec, [], source=RubricSpecSource.TEACHER, input_hash=rubric_input_hash(locked),
        membership_id=membership_id,
    )
    return record, []


# ===== entry points =====

async def parse_question_rubric(question_id: UUID, input_hash: str, *, force: bool = False) -> None:
    """Body of `parse_rubric_task`: parse one question's rubric in the background."""
    with Session(engine) as db:
        question = crud.question.get(db, id=question_id)
        log = logger.bind(question_id=str(question_id))
        if question is None:
            log.info("rubric_parse_skipped", reason="question deleted")
            return
        if rubric_input_hash(question) != input_hash:
            log.info("rubric_parse_skipped", reason="stale task: inputs changed since it was queued")
            return
        if not force and current_spec(db, question) is not None:
            log.info("rubric_parse_skipped", reason="already parsed for these inputs")
            return
        with (
            rubric_trace(question.id, question.exam_id),
            run_router(),
            budget(PARSE_MAX_CALLS, PARSE_MAX_COST_USD),
            recording_to(DbCallRecorder(None, None, question.id)),
        ):
            await parse_and_store(db, question)


async def ensure_rubric_specs(
    db: Session, questions: list[Question], recorder: DbCallRecorder
) -> dict[UUID, Optional[RubricSpecRecord]]:
    """Make sure every question has a spec for its current inputs, parsing inline (under the
    grading run's router, budget and recorder) when one is missing. Returns each question's
    current spec, or None where parsing failed. Invalid specs are returned as they are: the same
    inputs would parse the same way, so the teacher has to edit them."""
    specs: dict[UUID, Optional[RubricSpecRecord]] = dict(current_specs(db, questions))
    for question in questions:
        if specs.get(question.id) is None:
            with recording_to(recorder.for_question(question.id)):
                specs[question.id] = await parse_and_store(db, question)
    return specs

"""Exam draft lifecycle: create from documents, extract (background), edit (new version), confirm."""

from typing import Optional
from uuid import UUID

import structlog
from sqlmodel import Session, col, select

from app import crud
from app.audit.recorder import DbCallRecorder
from app.core.constants import QuestionType
from app.core.db import engine
from app.exam_drafts.checks import check_content, check_pages
from app.exam_drafts.extract import extract_page
from app.exam_drafts.link import link_rubric
from app.exam_drafts.merge import PageInput, attach_rubric, merge
from app.exam_drafts.schema import DraftContent, DraftQuestion, Issue
from app.ingestion.pages import DocumentError
from app.ingestion.service import ensure_pages
from app.llm.budget import budget
from app.llm.recorder import recording_to
from app.llm.router import run_router
from app.llm.types import CallContext, LLMError
from app.models.base import utcnow
from app.models.document import Document
from app.models.exam import Exam, Question
from app.models.exam_draft import DraftSource, DraftStatus, ExamDraft
from app.observability.tracing import exam_trace
from app.rubrics import service as rubric_service
from app.services.labels import exam_labels

logger = structlog.get_logger(__name__)

EXAM_ROLES = {"question_paper", "rubric", "question_paper_and_rubric", "blank_copy"}
# Per extraction: one call per page (+ repair) and one linking call, plus room for fallbacks
MAX_CALLS_PER_PAGE = 3
MAX_COST_USD = 5.0


class DraftError(ValueError):
    """The draft can't be created or confirmed; the message is safe to show to the user."""

    def __init__(self, message: str, issues: Optional[list[Issue]] = None):
        super().__init__(message)
        self.issues = issues or []


def _next_version(db: Session, exam_id: UUID) -> int:
    versions = db.exec(select(ExamDraft.version).where(ExamDraft.exam_id == exam_id)).all()
    return max(versions, default=0) + 1


def blocking(issues: list[dict] | list[Issue]) -> list[Issue]:
    parsed = [i if isinstance(i, Issue) else Issue.model_validate(i) for i in issues]
    return [i for i in parsed if i.severity == "blocking"]


def existing_questions(db: Session, exam: Exam) -> list[DraftQuestion]:
    """The exam's current questions, for drafts that only add rubrics."""
    questions = crud.question.get_by_exam(db, exam_id=exam.id)
    return [
        DraftQuestion(label=label, printed_label=q.printed_label, text=q.question_text, marks=q.max_score,
                      question_type=q.question_type.value, choice_group=q.choice_group)
        for label, q in zip(exam_labels(questions), questions)
    ]


def create_draft(db: Session, exam: Exam, document_ids: list[UUID], membership_id: Optional[UUID]) -> ExamDraft:
    """A pending draft for these exam documents (the caller enqueues extraction)."""
    if not document_ids:
        raise DraftError("Choose at least one document.")
    documents = db.exec(select(Document).where(col(Document.id).in_(document_ids))).all()
    found = {d.id: d for d in documents}
    missing = [str(i) for i in document_ids if i not in found or found[i].exam_id != exam.id]
    if missing:
        raise DraftError(f"Documents not found in this exam: {', '.join(missing)}")
    if any(found[i].role not in EXAM_ROLES for i in document_ids):
        raise DraftError("Only question papers, rubrics and blank copies can define an exam.")
    draft = ExamDraft(
        exam_id=exam.id, version=_next_version(db, exam.id), source=DraftSource.AI,
        document_ids=[str(i) for i in document_ids], created_by_membership_id=membership_id,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


async def _extract(db: Session, draft: ExamDraft, exam: Exam) -> tuple[DraftContent, list[Issue]]:
    documents = [db.get(Document, UUID(i)) for i in draft.document_ids]
    pages = [(document, page) for document in documents for page in ensure_pages(db, document)]  # type: ignore[arg-type]
    inputs: list[PageInput] = []
    for number, (document, page) in enumerate(pages, start=1):
        extraction = await extract_page(
            page, document.role, number, len(pages), CallContext(purpose="extract_exam_page")
        )
        inputs.append(PageInput(str(document.id), page.page_index, document.role, extraction))
    # Written after the model calls: a pending write would hold the database lock while each call's
    # audit row is written from its own session (SQLite allows one writer)
    for (_, page), page_input in zip(pages, inputs):
        page.page_role = page_input.extraction.page_kind
        page.has_handwriting = page_input.extraction.has_handwriting
        db.add(page)
    db.commit()

    content, pieces = merge(inputs, existing=existing_questions(db, exam))
    links = await link_rubric(content.questions, pieces, CallContext(purpose="link_rubric")) if pieces else {}
    from_rubric = attach_rubric(content, pieces, links)
    issues = check_content(content) + check_pages(content)
    issues += [Issue(severity="warning", code="marks_from_rubric", label=label,
                     message=f"Question {label} has no printed marks; its rubric's marks were used.")
               for label in from_rubric]
    return content, issues


async def extract_draft(draft_id: UUID) -> None:
    """Body of `extract_exam_task`: fill a pending draft from its documents."""
    with Session(engine) as db:
        draft = db.get(ExamDraft, draft_id)
        if draft is None or draft.status != DraftStatus.PENDING:
            logger.info("exam_extraction_skipped", draft_id=str(draft_id))
            return
        exam = db.get(Exam, draft.exam_id)
        page_count = sum(
            (db.get(Document, UUID(i)).page_count or 10) for i in draft.document_ids  # type: ignore[union-attr]
        )
        try:
            with (
                exam_trace(draft.id, draft.exam_id),
                run_router(),
                budget(MAX_CALLS_PER_PAGE * page_count + 5, MAX_COST_USD),
                recording_to(DbCallRecorder(None, None, exam_draft_id=draft.id)),
            ):
                content, issues = await _extract(db, draft, exam)  # type: ignore[arg-type]
        except (DocumentError, LLMError) as e:
            db.rollback()
            message = str(e) if isinstance(e, DocumentError) else f"The documents couldn't be read by the model ({e})"
            draft = db.get(ExamDraft, draft_id)
            draft.status, draft.error = DraftStatus.FAILED, message[:2000]  # type: ignore[union-attr]
            db.add(draft)
            db.commit()
            logger.warning("exam_extraction_failed", draft_id=str(draft_id), error=str(e))
            return
        draft.content = content.model_dump(mode="json")
        draft.issues = [i.model_dump() for i in issues]
        draft.status = DraftStatus.READY
        db.add(draft)
        db.commit()
        logger.info("exam_extracted", draft_id=str(draft_id), questions=len(content.questions),
                    blocking=len(blocking(issues)))


def save_teacher_version(db: Session, draft: ExamDraft, content: DraftContent, membership_id: Optional[UUID]) -> ExamDraft:
    """The teacher's corrections as a new version (checks re-run; page warnings carried over)."""
    if draft.status not in (DraftStatus.READY, DraftStatus.SUPERSEDED):
        raise DraftError(f"A {draft.status} draft can't be edited.")
    content.pages = DraftContent.model_validate(draft.content).pages if draft.content else []
    version = ExamDraft(
        exam_id=draft.exam_id, version=_next_version(db, draft.exam_id), source=DraftSource.TEACHER,
        status=DraftStatus.READY, based_on_id=draft.id, document_ids=draft.document_ids,
        content=content.model_dump(mode="json"),
        issues=[i.model_dump() for i in check_content(content) + check_pages(content)],
        created_by_membership_id=membership_id,
    )
    if draft.status == DraftStatus.READY:
        draft.status = DraftStatus.SUPERSEDED
        db.add(draft)
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def confirm_draft(db: Session, draft: ExamDraft, membership_id: Optional[UUID]) -> list[tuple[UUID, str]]:
    """Apply a ready draft to the exam's questions. Returns the rubric parses to enqueue."""
    if draft.status != DraftStatus.READY:
        raise DraftError(f"Only a ready draft can be confirmed (this one is {draft.status}).")
    problems = blocking(draft.issues)
    if problems:
        raise DraftError("Fix the blocking issues before confirming.", problems)
    exam = db.get(Exam, draft.exam_id)
    content = DraftContent.model_validate(draft.content)
    live = crud.question.get_by_exam(db, exam_id=exam.id)  # type: ignore[union-attr]

    if content.mode == "rubric_only":
        by_label = dict(zip(exam_labels(live), live))
        changed = []
        for dq in content.questions:
            question = by_label.get(dq.label)
            if question is not None and dq.rubric:
                question.rubric_criteria = dq.rubric
                db.add(question)
                changed.append(question)
    else:
        # Update questions in place by label, so graded answers keep pointing at the same question
        by_label = {q.label: q for q in live if q.label}
        changed, kept = [], set()
        for order, dq in enumerate(content.questions, start=1):
            question = by_label.get(dq.label) or Question(exam_id=exam.id, question_text="", order_index=order, max_score=1)  # type: ignore[union-attr]
            question.question_text = f"{dq.context}\n\n{dq.text}" if dq.context else dq.text
            question.max_score = dq.marks  # type: ignore[assignment]
            question.rubric_criteria = dq.rubric
            question.question_type = QuestionType(dq.question_type)
            question.label, question.printed_label, question.choice_group = dq.label, dq.printed_label, dq.choice_group
            question.order_index = order
            db.add(question)
            changed.append(question)
            kept.add(question.id)
        now = utcnow()
        for question in live:
            if question.id not in kept:
                question.deleted_at = now
                db.add(question)
        exam.config = {**(exam.config or {}), "choice_groups": [g.model_dump() for g in content.choice_groups]}  # type: ignore[union-attr]
        db.add(exam)

    to_parse = rubric_service.mark_changed(db, changed)
    draft.status, draft.confirmed_at, draft.confirmed_by_membership_id = DraftStatus.CONFIRMED, utcnow(), membership_id
    db.add(draft)
    for other in db.exec(select(ExamDraft).where(ExamDraft.exam_id == draft.exam_id, ExamDraft.status == DraftStatus.READY,
                                                 ExamDraft.id != draft.id)).all():
        other.status = DraftStatus.SUPERSEDED
        db.add(other)
    db.commit()
    return to_parse

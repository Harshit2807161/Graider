"""Grade one question: precheck, grade, check, evaluate, revise (Proposal 002 §7.1).

Per-question problems escalate that answer only, with a reason and, where one exists, a proposed
score for the teacher. Only an exhausted budget stops the whole run (LLMBudgetExceeded propagates).
"""

import re
from dataclasses import dataclass, field
from typing import Any, Optional
from uuid import UUID

import structlog

from app.core.config import settings
from app.grading import prompts
from app.grading.checks import (
    check_grade,
    check_rejections,
    check_replies,
    check_structure,
    effective_agreement,
    total,
)
from app.grading.sampling import spot_check
from app.grading.schemas import PAGE_INVENTORY_MISMATCH, grade_schema, review_schema, revision_schema
from app.grading.stitch import StitchedAnswer
from app.llm.config import get_llm_settings
from app.llm.router import get_router
from app.llm.types import CallContext, LLMAllTargetsFailed, LLMRequest, LLMResult, Role, TextPart
from app.models.grading import AnswerStatus, EscalationReason
from app.rubrics.schema import RubricSpec

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class ExamSettings:
    """Grading settings an exam can set for itself (`exam.config`); the GRADING_* settings otherwise."""
    agreement_threshold: float
    spot_check_rate: float

    @classmethod
    def of(cls, config: Optional[dict[str, Any]] = None) -> "ExamSettings":
        config = config or {}
        return cls(
            agreement_threshold=float(config.get("agreement_threshold", settings.GRADING_AGREEMENT_THRESHOLD)),
            spot_check_rate=float(config.get("spot_check_rate", settings.GRADING_SPOT_CHECK_RATE)),
        )


@dataclass
class QuestionInput:
    question_id: UUID
    label: str
    text: str
    max_score: float
    spec: Optional[RubricSpec]  # None when the rubric is invalid or couldn't be parsed
    answer: Optional[StitchedAnswer]  # None when no answer was found


@dataclass
class QuestionOutcome:
    question_id: UUID
    label: str
    status: str
    max_score: float
    score: Optional[float] = None
    criteria: list[dict[str, Any]] = field(default_factory=list)
    rounds: list[dict[str, Any]] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    escalation_reason: Optional[str] = None
    feedback: Optional[str] = None
    grader_model: Optional[str] = None
    evaluator_model: Optional[str] = None
    fallback_used: bool = False

    def escalate(self, reason: str, *, keep_score: bool = True) -> "QuestionOutcome":
        self.status, self.escalation_reason = AnswerStatus.ESCALATED, reason
        if not keep_score:
            self.score = None
        return self


class _Escalate(Exception):
    def __init__(self, reason: str, keep_score: bool = True):
        self.reason, self.keep_score = reason, keep_score


async def _call(role: Role, system: str, text: str, schema: type, purpose: str, q: QuestionInput, round_no: int,
                exclude: frozenset[str] = frozenset()) -> LLMResult:
    return await get_router().call(LLMRequest(
        role=role, system=system, parts=[TextPart(text=text)], output_schema=schema,
        context=CallContext(purpose=purpose, question_id=q.label, round=round_no), exclude_models=exclude,
    ))


class _Grading:
    """The current grading of one answer, and the calls that produced it."""

    def __init__(self, q: QuestionInput, outcome: QuestionOutcome):
        assert q.spec is not None and q.answer is not None
        self.q, self.outcome, self.spec, self.answer = q, outcome, q.spec, q.answer.text
        self.ids = [c.id for c in self.spec.criteria]
        self.block = prompts.question_block(q.label, q.text, q.max_score, self.spec, self.answer)
        self.system = f"{prompts.persona(self.spec.subject)}\n\n{prompts.GRADER_RULES}"
        self.criteria: list[dict[str, Any]] = []
        self.feedback = ""

    def _took(self, result: LLMResult, examiner: str) -> dict:
        if examiner == "grader":
            self.outcome.grader_model = result.model_answered
        else:
            self.outcome.evaluator_model = result.model_answered
        self.outcome.fallback_used |= result.fallback_used
        return result.parsed.model_dump()

    async def grade(self) -> None:
        """Grade, check, and repair once if the checks fail. The grader's fallbacks never land on the
        evaluator's model (the evaluator must stay a second, independent examiner)."""
        text = self.block
        exclude = frozenset({get_llm_settings().role(Role.EVALUATOR).primary.model})
        for attempt in range(2):
            out = self._took(await _call(Role.GRADER, self.system, text, grade_schema(self.ids),
                                         "grade" if attempt == 0 else "grade_fix", self.q, 0, exclude), "grader")
            errors = check_grade(out["criteria"], self.spec, self.answer)
            if not errors:
                self._accept(out)
                return
            text = f"{self.block}\n\nYour grading had these problems; fix them:\n- " + "\n- ".join(errors)
        self._accept(out)
        if not check_structure(out["criteria"], self.spec):
            # Only the quotes failed: a misquote is not a wrong grade, so the teacher sees the proposal.
            raise _Escalate(EscalationReason.EVIDENCE_NOT_FOUND)
        raise _Escalate(EscalationReason.CHECK_FAILED, keep_score=False)

    def _accept(self, out: dict) -> None:
        self.criteria, self.feedback = out["criteria"], out["feedback"]
        if out["flags"]:
            self.outcome.flags = list(out["flags"])
            raise _Escalate(EscalationReason.grader_flag(out["flags"][0]), keep_score=False)

    async def evaluate(self, round_no: int) -> dict:
        system = f"{prompts.persona(self.spec.subject)}\n\n{prompts.EVALUATOR_RULES}"
        text = f"{self.block}\n\nThe grader's grading:\n{prompts.grading_json(self.criteria, self.feedback)}"
        exclude = frozenset({self.outcome.grader_model}) if self.outcome.grader_model else frozenset()
        return self._took(await _call(Role.EVALUATOR, system, text, review_schema(self.ids), "evaluate",
                                      self.q, round_no, exclude), "evaluator")

    async def revise(self, review: dict, round_no: int) -> list[dict]:
        points = review["feedback"]
        listing = "\n".join(f"{i}. [{p['criterion_id']}] {p['point']}" for i, p in enumerate(points))
        base = (f"{self.block}\n\nYour grading:\n{prompts.grading_json(self.criteria, self.feedback)}\n\n"
                f"The second examiner's feedback:\n{listing}")
        system = f"{self.system}\n\n{prompts.REVISION_RULES}"
        exclude = frozenset({self.outcome.evaluator_model}) if self.outcome.evaluator_model else frozenset()
        text = base
        for attempt in range(2):
            out = self._took(await _call(Role.GRADER, system, text, revision_schema(self.ids),
                                         "revise" if attempt == 0 else "revise_fix", self.q, round_no, exclude), "grader")
            errors = (check_grade(out["criteria"], self.spec, self.answer) + check_replies(out["replies"], len(points))
                      + check_rejections(out["replies"], points, self.criteria, out["criteria"]))
            if not errors:
                self._accept(out)
                return out["replies"]
            text = f"{base}\n\nYour revision had these problems; fix them:\n- " + "\n- ".join(errors)
        raise _Escalate(EscalationReason.CHECK_FAILED)


_DRAWING = re.compile(
    r"\b(?:"
    r"(?:draws?|drawn|drawing)\b(?!\s+(?:(?:an?|the|your|some)\s+)?(?:conclusions?|inferences?|attention|comparisons?|parallels?))"
    r"|diagrams?|sketch(?:es|ed)?|label(?:led|ed)?\s+(?:the\s+)?(?:figure|diagram)|graphs?"
    r"|plot(?:ted|ting)?\s+(?:the|a|an|on|these|this|it)\b|circuits?"
    r")",
    re.IGNORECASE,
)


def rubric_expects_drawing(spec: Optional[RubricSpec]) -> bool:
    """True when the rubric asks for a drawing (diagram, graph, sketch, circuit...).

    Drawings leave nothing in the transcript, so until page crops reach the grader such answers
    keep their proposed score but go to the teacher.
    """
    if spec is None:
        return False
    texts = [spec.grading_notes or ""]
    for c in spec.criteria:
        texts += [c.description, c.expected_answer or "", c.notes or ""]
    return any(_DRAWING.search(t) for t in texts if t)


async def grade_question(q: QuestionInput, run_id: UUID, exam: Optional[ExamSettings] = None) -> QuestionOutcome:
    exam = exam or ExamSettings.of()
    outcome = QuestionOutcome(q.question_id, q.label, AnswerStatus.GRADED, q.max_score)
    if q.answer is None or not q.answer.text:
        return outcome.escalate(EscalationReason.NO_ANSWER_FOUND, keep_score=False)
    if q.spec is None:
        return outcome.escalate(EscalationReason.RUBRIC_INVALID, keep_score=False)

    grading = _Grading(q, outcome)
    try:
        await grading.grade()
        threshold = exam.agreement_threshold
        for round_no in range(settings.GRADING_MAX_REVISIONS + 1):
            review = await grading.evaluate(round_no)
            effective, apart = effective_agreement(
                review["agreement"], grading.criteria, review["own_assessment"], q.spec,
                threshold=threshold, tolerance_fraction=settings.GRADING_CRITERION_TOLERANCE,
            )
            outcome.rounds.append({
                "round": round_no, "grader": grading.criteria, "grader_total": total(grading.criteria),
                "evaluator": review["own_assessment"], "evaluator_total": total(review["own_assessment"]),
                "agreement": review["agreement"], "effective_agreement": effective, "criteria_apart": apart,
                "feedback": review["feedback"], "summary": review["summary"],
            })
            if effective >= threshold:
                break
            if round_no == settings.GRADING_MAX_REVISIONS:
                raise _Escalate(EscalationReason.EVALUATOR_DISAGREEMENT)
            outcome.rounds[-1]["replies"] = await grading.revise(review, round_no + 1)
    except _Escalate as e:
        outcome.criteria, outcome.feedback = grading.criteria, grading.feedback or None
        outcome.score = total(grading.criteria) if grading.criteria else None
        return outcome.escalate(e.reason, keep_score=e.keep_score)
    except LLMAllTargetsFailed as e:
        logger.warning("question_models_failed", question=q.label, error=str(e))
        outcome.criteria = grading.criteria
        return outcome.escalate(EscalationReason.ALL_MODELS_FAILED, keep_score=False)

    outcome.criteria, outcome.feedback, outcome.score = grading.criteria, grading.feedback, total(grading.criteria)
    outcome.flags = list(q.answer.flags)
    if q.answer.starts > 1:
        return outcome.escalate(EscalationReason.MULTIPLE_ATTEMPTS)
    if rubric_expects_drawing(q.spec):
        return outcome.escalate(EscalationReason.DRAWING_EXPECTED)
    if PAGE_INVENTORY_MISMATCH in q.answer.flags:
        return outcome.escalate(EscalationReason.PAGE_INVENTORY_MISMATCH)
    confidence = q.answer.confidence
    if confidence is not None and confidence < settings.GRADING_OCR_CONFIDENCE_THRESHOLD:
        return outcome.escalate(EscalationReason.LOW_OCR_CONFIDENCE)
    if spot_check(run_id, q.question_id, exam.spot_check_rate):
        return outcome.escalate(EscalationReason.SPOT_CHECK)
    return outcome

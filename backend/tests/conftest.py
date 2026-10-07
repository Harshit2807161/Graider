"""Shared test setup: SQLite database, temp upload dir, and a scripted fake model invoker."""

import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable, Optional

# Configure the app before anything imports app.core.config (settings are cached at import).
_TMP = Path(tempfile.mkdtemp(prefix="gr8r-tests-"))
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{_TMP / 'test.db'}")
os.environ["UPLOAD_DIR"] = str(_TMP / "uploads")

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

import app.models  # noqa: E402,F401  (registers tables)
from app.core.constants import Role  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.llm import router as router_module  # noqa: E402
from app.llm.invoker import InvokeRequest, InvokeResponse  # noqa: E402
from app.llm.types import TextPart, Usage  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.exam import Exam, Question  # noqa: E402
from app.models.org import Organization  # noqa: E402
from app.models.user import Membership, User  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


# Output schema title → short kind name used by tests
SCHEMA_KINDS = {
    "AnswerTranscription": "ocr",
    "GradeOutput": "grade",
    "TagOutput": "tag",
    "EvaluationOutput": "evaluate",
    "ParsedRubric": "parse_rubric",
    "PageExtraction": "extract_page",
    "RubricLinks": "link_rubric",
    # grading v2
    "PageAnswers": "transcribe",
    "GradeResult": "grade_answer",
    "EvaluatorReview": "review",
    "GradeRevision": "revise",
}


def answer_of(prompt: str) -> str:
    """The transcribed answer in a grading prompt."""
    return prompt.split("Student's answer (transcribed):\n", 1)[1].split("\n\n", 1)[0]


def criteria_of(prompt: str) -> list[tuple[str, float]]:
    """(id, points) of the rubric criteria listed in a grading prompt."""
    return [(cid, float(pts)) for cid, pts in re.findall(r"\[(c\d+)\][^\n]*?\(([\d.]+) pts\)", prompt)]


def grading_in(prompt: str, heading: str) -> list[dict]:
    """The criteria JSON shown under a heading (e.g. "The grader's grading:")."""
    start = prompt.index(heading) + len(heading)
    return json.JSONDecoder().raw_decode(prompt[start:].lstrip())[0]["criteria"]


class FakeInvoker:
    """
    Scripted stand-in for the model invoker (the boundary below the router).

    Routes each call by output-schema title and records every request. Override a route by
    assigning `fake.ocr` / `fake.grade` / `fake.evaluate` / `fake.tag` / `fake.parse_rubric` to a
    callable that takes
    the prompt text and returns either a dict (the structured output) or a string (raw model
    text, parsed as JSON if possible, e.g. to simulate invalid output). A handler may also
    return an InvokeResponse or raise/return an exception.
    """

    def __init__(self):
        self.calls: list[dict[str, Any]] = []
        self.ocr: Optional[Callable[[str], Any]] = None
        self.grade: Optional[Callable[[str], Any]] = None
        self.evaluate: Optional[Callable[[str], Any]] = None
        self.tag: Optional[Callable[[str], Any]] = None
        self.parse_rubric: Optional[Callable[[str], Any]] = None
        self.extract_page: Optional[Callable[[str], Any]] = None  # exam document pages
        self.link_rubric: Optional[Callable[[str], Any]] = None
        # grading v2: page transcription, grade, evaluator review, revision
        self.transcribe: Optional[Callable[[str], Any]] = None
        self.grade_answer: Optional[Callable[[str], Any]] = None
        self.review: Optional[Callable[[str], Any]] = None
        self.revise: Optional[Callable[[str], Any]] = None

    @staticmethod
    def prompt_of(req: InvokeRequest) -> str:
        return "\n".join(p.text for p in req.parts if isinstance(p, TextPart))

    # --- default behaviours ---
    @staticmethod
    def _default_ocr(req: InvokeRequest) -> dict:
        labels = req.json_schema["properties"]["answers"]["items"]["properties"]["question_id"]["enum"]
        return {
            "answers": [
                {"question_id": qid, "text": f"student answer for {qid}", "confidence": 0.9} for qid in labels
            ]
        }

    @staticmethod
    def _default_grade(prompt: str) -> dict:
        max_score = float(re.search(r"Maximum Score: ([\d.]+)", prompt).group(1))
        return {
            "score": max_score / 2,
            "reasoning": "Half the rubric points are covered.",
            "feedback": "Cover the remaining points.",
            "confidence": 0.9,
        }

    @staticmethod
    def _default_parse_rubric(prompt: str) -> dict:
        """A valid spec: one criterion worth the question's full marks."""
        max_score = float(re.search(r"Maximum score: ([\d.]+)", prompt).group(1))
        return {
            "kind": "criteria",
            "subject": "math",
            "criteria_count": 1,
            "criteria": [{"description": "Gives a correct, complete answer", "points": max_score,
                          "expected_answer": None, "notes": None}],
            "grading_notes": None,
            "parser_warnings": [],
        }

    @staticmethod
    def _default_transcribe(req: InvokeRequest) -> dict:
        """Every question answered on the first page."""
        props = req.json_schema["properties"]["segments"]["items"]["properties"]
        labels = [label for label in props["label"]["enum"] if label != "unassigned"]
        first_page = "This is page 1 of" in FakeInvoker.prompt_of(req)
        return {"page_kind": "answers", "has_handwriting": True, "segments": [
            {"label": label, "label_as_written": label, "text": f"student answer for {label}", "starts_answer": True,
             "crossed_out": False, "confidence": 0.9} for label in labels] if first_page else []}

    @staticmethod
    def _default_grade_answer(prompt: str) -> dict:
        """Full marks on every criterion, quoting the answer."""
        quote = answer_of(prompt).splitlines()[0]
        return {"criteria": [{"id": cid, "score": pts, "evidence": quote, "justification": "Meets the criterion."}
                             for cid, pts in criteria_of(prompt)], "feedback": "Well done.", "flags": []}

    @staticmethod
    def _default_review(prompt: str) -> dict:
        """Agrees with the grader."""
        grader = grading_in(prompt, "The grader's grading:")
        return {"own_assessment": [{"id": c["id"], "score": c["score"], "reason": "Agree."} for c in grader],
                "agreement": 0.95, "feedback": [], "summary": "Agree."}

    @staticmethod
    def _default_revise(prompt: str) -> dict:
        """Accepts every point and keeps its grading (tests script real revisions)."""
        count = len(re.findall(r"^\d+\. \[c\d+\]", prompt.split("The second examiner's feedback:")[1], re.M))
        return {"replies": [{"feedback_index": i, "decision": "accept", "rationale": "Agreed."} for i in range(count)],
                "criteria": grading_in(prompt, "Your grading:"), "feedback": "Revised.", "flags": []}

    async def invoke(self, req: InvokeRequest) -> InvokeResponse:
        kind = SCHEMA_KINDS.get(req.json_schema.get("title"), "other")
        prompt = self.prompt_of(req)
        self.calls.append({"kind": kind, "system": req.system, "prompt": prompt, "request": req})

        if kind == "ocr":
            out = self.ocr(prompt) if self.ocr else self._default_ocr(req)
        elif kind == "grade":
            out = (self.grade or self._default_grade)(prompt)
        elif kind == "tag":
            out = self.tag(prompt) if self.tag else {"subject": "math", "question_type": "problem"}
        elif kind == "transcribe":
            out = self.transcribe(prompt) if self.transcribe else self._default_transcribe(req)
        elif kind == "grade_answer":
            out = (self.grade_answer or self._default_grade_answer)(prompt)
        elif kind == "review":
            out = (self.review or self._default_review)(prompt)
        elif kind == "revise":
            out = (self.revise or self._default_revise)(prompt)
        elif kind == "extract_page":
            out = (self.extract_page or (lambda p: {
                "page_kind": "other", "has_handwriting": False, "instructions": None, "total_marks": None,
                "questions": [], "rubric_items": [], "choice_groups": [],
            }))(prompt)
        elif kind == "link_rubric":
            out = (self.link_rubric or (lambda p: {"links": []}))(prompt)
        elif kind == "parse_rubric":
            out = (self.parse_rubric or self._default_parse_rubric)(prompt)
        elif kind == "evaluate":
            out = self.evaluate(prompt) if self.evaluate else {
                "is_acceptable": True, "concerns": "", "improvement_suggestions": ""
            }
        else:
            raise AssertionError(f"unexpected schema {req.json_schema.get('title')}")

        if isinstance(out, BaseException):
            raise out
        if isinstance(out, InvokeResponse):
            return out
        parsed, parse_error, text = None, None, out if isinstance(out, str) else json.dumps(out)
        if isinstance(out, dict):
            parsed = out
        else:
            try:
                candidate = json.loads(out)
                parsed = candidate if isinstance(candidate, dict) else None
            except json.JSONDecodeError:
                pass
            if parsed is None:
                parse_error = "JSONDecodeError: not a JSON object"
        return InvokeResponse(
            text=text,
            parsed=parsed,
            parse_error=parse_error,
            model_answered=req.target.model,
            response_id=f"fake-{len(self.calls)}",
            usage=Usage(input_tokens=1000, output_tokens=200),
            request={"model": req.target.model, "system": req.system},
        )

    def calls_of(self, kind: str) -> list[dict]:
        return [c for c in self.calls if c["kind"] == kind]


@pytest.fixture
def fake_llm(monkeypatch) -> FakeInvoker:
    """Route every model call through a FakeInvoker (no API keys, no network)."""
    fake = FakeInvoker()
    monkeypatch.setattr(router_module, "_invoker_factory", lambda: fake)

    import app.agents.orchestrator as orchestrator_module
    monkeypatch.setattr(orchestrator_module, "_orchestrator", None)
    return fake


@pytest.fixture(autouse=True)
def rubric_parses(monkeypatch) -> list[tuple]:
    """Capture parse_rubric_task dispatches (question id, input hash, force) instead of using Redis."""
    from app.worker import parse_rubric_task

    calls: list[tuple] = []
    monkeypatch.setattr(parse_rubric_task, "delay", lambda *args: calls.append(args))
    return calls


if engine.dialect.name == "sqlite":
    # Enforce foreign keys like Postgres does (SQLite ignores them by default), so insert-order
    # bugs fail here too and not only in CI's Postgres job
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _sqlite_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


@pytest.fixture(autouse=True)
def fresh_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield


@pytest.fixture
def db():
    with Session(engine) as session:
        yield session


def make_user(db: Session, email: str, *, password: str = "password123", superuser: bool = False) -> User:
    user = User(
        email=email,
        full_name=email.split("@")[0],
        hashed_password=get_password_hash(password),
        is_superuser=superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_org(db: Session, slug: str) -> Organization:
    org = Organization(name=slug.title(), slug=slug)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def add_member(db: Session, user: User, org: Organization, role: Role) -> Membership:
    membership = Membership(user_id=user.id, org_id=org.id, role=role)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def make_exam(db: Session, org: Organization, creator: Membership, questions: list[dict]) -> Exam:
    exam = Exam(org_id=org.id, created_by_membership_id=creator.id, name="Unit Test")
    db.add(exam)
    db.commit()
    db.refresh(exam)
    for i, q in enumerate(questions, start=1):
        db.add(Question(exam_id=exam.id, order_index=q.get("order_index", i), **{
            k: v for k, v in q.items() if k != "order_index"
        }))
    db.commit()
    return exam


@pytest.fixture
def school(db):
    """An org with a teacher, a student, and an exam with two questions."""
    org = make_org(db, "school")
    teacher = make_user(db, "teacher@school.test")
    student = make_user(db, "student@school.test")
    teacher_m = add_member(db, teacher, org, Role.TEACHER)
    student_m = add_member(db, student, org, Role.STUDENT)
    exam = make_exam(db, org, teacher_m, [
        {"question_text": "Solve 2x + 5 = 15", "max_score": 4, "rubric_criteria": "Subtract 5\nDivide by 2"},
        {"question_text": "Explain photosynthesis", "max_score": 6},
    ])
    return {"org": org, "teacher": teacher, "student": student,
            "teacher_m": teacher_m, "student_m": student_m, "exam": exam}

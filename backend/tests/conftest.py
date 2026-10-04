"""Shared test setup: SQLite database, temp upload dir, and a scripted fake LLM."""

import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Callable, Optional

# Configure the app before anything imports app.core.config (settings are cached at import).
_TMP = Path(tempfile.mkdtemp(prefix="gr8r-tests-"))
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{_TMP / 'test.db'}")
os.environ["UPLOAD_DIR"] = str(_TMP / "uploads")
os.environ["LLM_PROVIDER"] = "openai"
os.environ["OPENAI_API_KEY"] = "sk-test"

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

import app.models  # noqa: E402,F401  (registers tables)
from app.core import llm_provider  # noqa: E402
from app.core.constants import Role  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.core.llm_provider import LLMProvider  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.exam import Exam, Question  # noqa: E402
from app.models.org import Organization  # noqa: E402
from app.models.user import Membership, User  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


class FakeLLM(LLMProvider):
    """
    Scripted stand-in for every LLM role.

    Routes each call by prompt content (OCR / tagging / evaluation / grading) and records
    what was asked so tests can assert on prompts. Override a route by assigning a
    callable that takes the prompt text and returns the raw model output.
    """

    def __init__(self):
        self.calls: list[dict] = []
        self.ocr: Optional[Callable[[str], str]] = None
        self.grade: Optional[Callable[[str], str]] = None
        self.evaluate: Optional[Callable[[str], str]] = None

    # --- default behaviours ---
    @staticmethod
    def _default_ocr(prompt: str) -> str:
        ids = re.search(r"EXACTLY one of these ids: (.+)", prompt).group(1).split(", ")
        return json.dumps({
            "answers": [
                {"question_id": qid, "text": f"student answer for {qid}", "confidence": 0.9}
                for qid in ids
            ]
        })

    @staticmethod
    def _default_grade(prompt: str) -> str:
        max_score = float(re.search(r"Maximum Score: ([\d.]+)", prompt).group(1))
        return json.dumps({
            "score": max_score / 2,
            "reasoning": "Half the rubric points are covered.",
            "feedback": "Cover the remaining points.",
            "confidence": 0.9,
        })

    # --- LLMProvider interface ---
    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        if "question classifier" in system_prompt:
            kind, handler = "tag", lambda p: '{"subject": "math", "question_type": "problem"}'
        elif "grading quality evaluator" in system_prompt:
            kind, handler = "evaluate", self.evaluate or (lambda p: '{"is_acceptable": true}')
        else:
            kind, handler = "grade", self.grade or self._default_grade
        self.calls.append({"kind": kind, "system": system_prompt, "prompt": user_prompt})
        return handler(user_prompt)

    def chat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        self.calls.append({"kind": "ocr", "prompt": prompt, "blocks": content_blocks})
        return (self.ocr or self._default_ocr)(prompt)

    def calls_of(self, kind: str) -> list[dict]:
        return [c for c in self.calls if c["kind"] == kind]


@pytest.fixture
def fake_llm(monkeypatch) -> FakeLLM:
    """Install a FakeLLM for every role and reset cached service singletons."""
    fake = FakeLLM()
    monkeypatch.setattr(llm_provider, "_grader_provider", fake)
    monkeypatch.setattr(llm_provider, "_orchestrator_provider", fake)
    monkeypatch.setattr(llm_provider, "_vision_provider", fake)

    import app.agents.orchestrator as orchestrator_module
    import app.services.ocr_service as ocr_module
    monkeypatch.setattr(orchestrator_module, "_orchestrator", None)
    monkeypatch.setattr(ocr_module, "_ocr_service", None)
    return fake


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

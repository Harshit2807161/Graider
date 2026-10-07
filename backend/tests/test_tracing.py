"""Langfuse tracing: one trace per grading run, everything nested in it, no images exported.

Uses the real Langfuse SDK with an in-memory OpenTelemetry exporter (no server needed).
"""

import json
import shutil
import uuid

import langfuse
import pytest
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableLambda
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from sqlmodel import Session

from app.audit.runs import create_run
from app.core.config import settings
from app.core.db import engine
from app.models.audit import GradingRun, RunStatus
from app.models.exam import Submission
from app.observability import tracing
from app.services.grading_service import run_grading
from tests.conftest import FIXTURES

IMAGE_B64 = "iVBORw0KGgo" + "A" * 4000


@pytest.fixture
def exported(monkeypatch):
    """Enable tracing for this test, exporting spans to memory."""
    exporter = InMemorySpanExporter()
    public_key = f"pk-lf-test-{uuid.uuid4().hex[:8]}"  # fresh SDK singleton per test

    class InMemoryLangfuse(langfuse.Langfuse):
        def __init__(self, **kwargs):
            super().__init__(**kwargs, span_exporter=exporter)

    monkeypatch.setattr(langfuse, "Langfuse", InMemoryLangfuse)
    monkeypatch.setattr(settings, "LANGFUSE_BASE_URL", "http://langfuse.invalid")
    monkeypatch.setattr(settings, "LANGFUSE_PUBLIC_KEY", public_key)
    monkeypatch.setattr(settings, "LANGFUSE_SECRET_KEY", "sk-lf-test")
    monkeypatch.setattr(tracing, "_state", {"initialised_pid": None, "enabled": False})

    def spans():
        langfuse.get_client(public_key=public_key).flush()
        return exporter.get_finished_spans()

    yield spans
    langfuse.get_client(public_key=public_key).shutdown()


def attrs_text(span) -> str:
    return json.dumps({k: v for k, v in span.attributes.items()}, default=str)


def test_mask_replaces_inline_images_only():
    data_uri = f"data:image/png;base64,{IMAGE_B64}"
    masked = tracing.mask_images(
        {
            "messages": [
                {"type": "text", "text": "Q1: 2x + 5 = 15"},
                {"type": "image", "base64": IMAGE_B64, "mime_type": "image/png"},
                {"type": "image_url", "image_url": {"url": data_uri}},
                {"source": {"type": "base64", "media_type": "image/png", "data": IMAGE_B64}},
            ]
        }
    )
    text = json.dumps(masked)
    assert IMAGE_B64 not in text and text.count("[image omitted") == 3
    assert masked["messages"][0]["text"] == "Q1: 2x + 5 = 15"


async def test_model_calls_nest_under_the_run_trace_without_images(exported):
    run_id, submission_id = uuid.uuid4(), uuid.uuid4()
    # Like the router's structured-output calls: a chain (whose span gets message objects) around a
    # chat model named after its role and purpose
    model = GenericFakeChatModel(messages=iter([AIMessage(content="x = 5")]), name="vision.ocr_answers")
    chain = RunnableLambda(lambda messages: messages) | model
    messages = [
        SystemMessage(content="Transcribe the answer"),
        HumanMessage(content=[{"type": "image", "base64": IMAGE_B64, "mime_type": "image/png"}]),
    ]

    with tracing.run_trace(run_id, submission_id, "upload") as trace_id:
        await chain.ainvoke(messages, config={"run_name": "vision.ocr_answers", "metadata": {"role": "vision"}})

    spans = exported()
    assert trace_id == tracing.trace_id_for(run_id)
    assert {format(s.context.trace_id, "032x") for s in spans} == {trace_id}
    root = next(s for s in spans if s.name == "grading_run")
    call = next(s for s in spans if s.name == "vision.ocr_answers" and s.parent.span_id == root.context.span_id)
    generation = next(s for s in spans if s.attributes.get("langfuse.observation.type") == "generation")
    assert generation.name == "vision.ocr_answers"  # dashboards group model calls by role.purpose
    assert generation.attributes["langfuse.observation.metadata.role"] == "vision"
    assert root.attributes["langfuse.trace.metadata.grading_run_id"] == str(run_id)
    assert root.attributes["session.id"] == str(submission_id)
    # The answer-sheet image never leaves the process; the text does
    assert all(IMAGE_B64 not in attrs_text(s) for s in spans)
    assert "Transcribe the answer" in attrs_text(call) and "[image omitted" in attrs_text(call)


async def test_grading_run_is_one_trace_linked_from_the_run(fake_llm, db, school, tmp_path, exported):
    sheet = tmp_path / "answer_sheet.png"
    shutil.copy(FIXTURES / "test_answer.png", sheet)
    submission = Submission(exam_id=school["exam"].id, original_file_url=str(sheet))
    db.add(submission)
    db.commit()
    run = create_run(db, submission_id=submission.id, trigger="regrade")

    await run_grading(run.id)

    with Session(engine) as fresh:
        run = fresh.get(GradingRun, run.id)
    spans = exported()
    assert run.status == RunStatus.SUCCEEDED and run.trace_id == tracing.trace_id_for(run.id)
    assert {format(s.context.trace_id, "032x") for s in spans} == {run.trace_id}
    # Every span (LangGraph nodes, model-call chains) descends from the run's root span
    by_id = {s.context.span_id: s for s in spans}
    root = next(s for s in spans if s.name == "grading_run")

    def descends_from_root(span) -> bool:
        while span.parent is not None and span.parent.span_id in by_id:
            span = by_id[span.parent.span_id]
        return span is root

    assert len(spans) > 5 and all(descends_from_root(s) for s in spans)
    # (fake models bypass LangChain, so here only the graph's spans appear)
    assert {"grade_submission", "read_page", "stitch", "grade"} <= {s.name for s in spans}


def test_tracing_problems_never_fail_grading(monkeypatch):
    monkeypatch.setattr(settings, "LANGFUSE_BASE_URL", "http://langfuse.invalid")
    monkeypatch.setattr(settings, "LANGFUSE_PUBLIC_KEY", "pk-lf-broken")
    monkeypatch.setattr(settings, "LANGFUSE_SECRET_KEY", "sk-lf-broken")
    monkeypatch.setattr(tracing, "_state", {"initialised_pid": None, "enabled": False})

    def broken(**_):
        raise RuntimeError("bad config")

    monkeypatch.setattr(langfuse, "Langfuse", broken)
    with tracing.run_trace(uuid.uuid4(), uuid.uuid4(), "upload") as trace_id:
        pass
    assert trace_id is None

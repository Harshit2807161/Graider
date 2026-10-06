"""Optional Langfuse tracing: engineering observability, NOT the audit record.

Enabled only when LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are all set (the
base URL is explicit so student text never goes to a hosted service by default). Trace delivery is
best-effort (batched, retried, then dropped), so the audit record lives in Postgres
(app/models/audit.py) and a grading run only keeps a soft link (`grading_runs.trace_id`).

- The client is created once per process, after fork (Celery prefork): `ensure_tracing()` is
  called from the task, never in the parent. Spans are exported in the background and flushed
  when the worker process shuts down.
- One trace per grading run, with an id derived from the run id. A LangChain configure hook adds
  the Langfuse handler to every LangChain/LangGraph run started inside it, so graph nodes and
  model calls nest under the run without any tracing code at the call sites.
- Answer-sheet images never leave the process: media upload is off and the mask replaces any
  base64 payload that would otherwise be sent.
- Tracing problems are logged and never fail grading.

Other SDK settings (LANGFUSE_SAMPLE_RATE, LANGFUSE_TRACING_ENVIRONMENT, LANGFUSE_TIMEOUT, …) are
read by the Langfuse SDK from the process environment.
"""

import hashlib
import os
from contextlib import ExitStack, contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional
from uuid import UUID

import structlog
from langchain_core.tracers.context import register_configure_hook
from pydantic import BaseModel

from app.core.config import settings

logger = structlog.get_logger(__name__)

_state: dict[str, Any] = {"initialised_pid": None, "enabled": False}

# Set to a Langfuse CallbackHandler while a run's trace is open; LangChain then attaches it to
# every run started in this context (inheritable, so nested runs keep their parent links).
_handler: ContextVar[Optional[Any]] = ContextVar("gr8r_langfuse_handler", default=None)
register_configure_hook(_handler, inheritable=True)


def is_configured() -> bool:
    return bool(settings.LANGFUSE_BASE_URL and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY)


def _omitted(payload: str) -> str:
    digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"[image omitted: {len(payload)} chars, sha256 {digest}]"


def mask_images(data: Any, **_: Any) -> Any:
    """Replace inline image payloads (data URIs, base64 blocks) before anything is exported.

    Chain spans receive LangChain message objects (pydantic models), so those are walked too.
    """
    if isinstance(data, BaseModel):
        return mask_images(data.model_dump())
    if isinstance(data, str):
        if data.startswith("data:") and ";base64," in data[:100]:
            return _omitted(data)
        return data
    if isinstance(data, list):
        return [mask_images(item) for item in data]
    if isinstance(data, tuple):
        return tuple(mask_images(item) for item in data)
    if isinstance(data, dict):
        is_media = data.get("type") in {"image", "image_url", "file", "media", "base64"}
        return {
            key: _omitted(value)
            if is_media and key in {"base64", "data"} and isinstance(value, str)
            else mask_images(value)
            for key, value in data.items()
        }
    return data


def ensure_tracing() -> bool:
    """Create the Langfuse client once per process. Returns whether tracing is enabled."""
    if _state["initialised_pid"] == os.getpid():
        return _state["enabled"]
    _state["initialised_pid"] = os.getpid()
    _state["enabled"] = False
    if not is_configured():
        return False

    os.environ.setdefault("LANGFUSE_MEDIA_UPLOAD_ENABLED", "false")  # images stay local
    try:
        from langfuse import Langfuse

        Langfuse(
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            secret_key=settings.LANGFUSE_SECRET_KEY,
            base_url=settings.LANGFUSE_BASE_URL,
            release=settings.CODE_VERSION,
            mask=mask_images,
        )
        _state["enabled"] = True
        logger.info("langfuse_tracing_enabled", base_url=settings.LANGFUSE_BASE_URL)
    except Exception:
        logger.warning("langfuse_tracing_disabled", base_url=settings.LANGFUSE_BASE_URL, exc_info=True)
    return _state["enabled"]


def shutdown_tracing() -> None:
    """Export queued spans before the process exits."""
    if not _state["enabled"] or _state["initialised_pid"] != os.getpid():
        return
    try:
        from langfuse import get_client

        get_client(public_key=settings.LANGFUSE_PUBLIC_KEY).shutdown()
    except Exception:
        logger.warning("langfuse_shutdown_failed", exc_info=True)


def trace_id_for(run_id: UUID) -> str:
    """The Langfuse trace id of a grading run (deterministic, so it can always be recomputed)."""
    from langfuse import Langfuse

    return Langfuse.create_trace_id(seed=str(run_id))


@contextmanager
def _trace(
    name: str,
    *,
    as_type: str,
    session_id: str,
    tags: list[str],
    metadata: dict[str, str],
    trace_id: Optional[str] = None,
) -> Iterator[Optional[str]]:
    """Open one trace whose root observation is `name`; yield its id (None when tracing is off)."""
    if not ensure_tracing():
        yield None
        return

    stack = ExitStack()
    try:
        from langfuse import get_client, propagate_attributes
        from langfuse.langchain import CallbackHandler

        client = get_client(public_key=settings.LANGFUSE_PUBLIC_KEY)
        root = stack.enter_context(
            client.start_as_current_observation(
                as_type=as_type,
                name=name,
                trace_context={"trace_id": trace_id} if trace_id else None,
                metadata=metadata,
            )
        )
        stack.enter_context(
            propagate_attributes(trace_name=name, session_id=session_id, tags=tags, metadata=metadata)
        )
        handler = CallbackHandler(public_key=settings.LANGFUSE_PUBLIC_KEY)
    except Exception:
        stack.close()
        logger.warning("langfuse_trace_start_failed", trace=name, exc_info=True)
        yield None
        return

    token = _handler.set(handler)
    with stack:
        try:
            yield root.trace_id
        finally:
            _handler.reset(token)


def run_trace(run_id: UUID, submission_id: UUID, trigger: str):
    """One trace per grading run, with an id derived from the run id. A submission's runs
    (upload, regrades) form one session."""
    ids = {"grading_run_id": str(run_id), "submission_id": str(submission_id)}
    return _trace(
        "grading_run", as_type="agent", session_id=str(submission_id), tags=[trigger], metadata=ids,
        trace_id=trace_id_for(run_id) if ensure_tracing() else None,
    )


def rubric_trace(question_id: UUID, exam_id: UUID):
    """One trace per background rubric parse; an exam's parses form one session."""
    ids = {"question_id": str(question_id), "exam_id": str(exam_id)}
    return _trace("rubric_parse", as_type="span", session_id=str(exam_id), tags=["rubric"], metadata=ids)

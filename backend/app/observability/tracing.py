"""Optional MLflow tracing: engineering observability, NOT the audit record.

Enabled only when MLFLOW_TRACKING_URI is set. MLflow tracing is best-effort (traces can be
dropped, sampled or deleted), so the audit record lives in Postgres (app/models/audit.py) and a
grading run only keeps a soft link to its trace (`grading_runs.mlflow_trace_id`).

Follows MLflow's production guidance:
- initialise per process, after fork (Celery prefork) — `ensure_tracing()` is called lazily
  from the worker, never in the parent;
- call `set_experiment` explicitly (env-only setup is broken in mlflow-tracing 3.16, #17619)
  and disable tracing instead of failing if the server is unreachable;
- keep images out of traces (MLFLOW_TRACE_MAX_ATTACHMENT_SIZE=1) and bound retries/flushes;
- one trace per grading run; LangChain autolog nests every model call under it.
"""

import os
from contextlib import contextmanager
from typing import Iterator, Optional
from uuid import UUID

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_state = {"initialised_pid": None, "enabled": False}

# Defaults that suit a background worker; any of them can be overridden by the environment
_ENV_DEFAULTS = {
    "MLFLOW_TRACE_MAX_ATTACHMENT_SIZE": "1",  # don't upload answer-sheet images to traces
    "MLFLOW_ASYNC_TRACE_LOGGING_RETRY_TIMEOUT": "60",  # bounded retries / shutdown flush
    "MLFLOW_TRACE_TIMEOUT_SECONDS": "2100",  # export unfinished traces at the task's hard limit
}


def ensure_tracing() -> bool:
    """Initialise tracing once per process. Returns whether tracing is enabled."""
    if _state["initialised_pid"] == os.getpid():
        return _state["enabled"]
    _state["initialised_pid"] = os.getpid()
    _state["enabled"] = False
    if not settings.MLFLOW_TRACKING_URI:
        return False

    for key, value in _ENV_DEFAULTS.items():
        os.environ.setdefault(key, value)
    try:
        import mlflow

        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        mlflow.set_experiment(settings.MLFLOW_EXPERIMENT)
        mlflow.langchain.autolog()
        _state["enabled"] = True
        logger.info("mlflow_tracing_enabled", uri=settings.MLFLOW_TRACKING_URI, experiment=settings.MLFLOW_EXPERIMENT)
    except Exception:
        logger.warning("mlflow_tracing_disabled", uri=settings.MLFLOW_TRACKING_URI, exc_info=True)
        try:
            import mlflow

            mlflow.tracing.disable()
        except Exception:
            pass
    return _state["enabled"]


def shutdown_tracing() -> None:
    """Flush queued traces before the process exits."""
    if not _state["enabled"]:
        return
    try:
        import mlflow

        mlflow.flush_trace_async_logging(terminate=True)
    except Exception:
        logger.warning("mlflow_flush_failed", exc_info=True)


@contextmanager
def run_trace(run_id: UUID, submission_id: UUID) -> Iterator[Optional[str]]:
    """Open one trace for a grading run and yield its id (None when tracing is off/sampled out)."""
    if not ensure_tracing():
        yield None
        return

    import mlflow

    with mlflow.start_span(name="grading_run", span_type="AGENT"):
        trace_id: Optional[str] = None
        try:
            mlflow.update_current_trace(
                client_request_id=str(run_id),
                metadata={"gr8r.grading_run_id": str(run_id), "gr8r.submission_id": str(submission_id)},
            )
            trace_id = mlflow.get_active_trace_id()
        except Exception:
            logger.warning("mlflow_trace_tagging_failed", run_id=str(run_id), exc_info=True)
        yield trace_id

"""The only module that talks to model providers, via LangChain chat models.

`LangChainInvoker` turns one request into one HTTP call:
- Claude → `ChatAnthropic` with native structured outputs (`output_config.format`)
- OpenAI and self-hosted open-weight (vLLM/SGLang, OpenAI-compatible) → `ChatOpenAI`
  with strict `json_schema` (server-side guided decoding for open-weight)
- targets without schema support → prompt-only "degraded" path, validated afterwards

Chat-model clients are created per run (`LangChainInvoker` instance), because Celery runs
each task in a fresh event loop and async HTTP clients can't be reused across loops.
"""

import json
import os
import time
from typing import Any, Optional, Protocol

import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, ConfigDict

from app.core.config import settings as app_settings
from app.llm.schema import extract_json_object
from app.llm.types import (
    ImagePart,
    LLMConfigError,
    LLMOutputInvalid,
    LLMTransportError,
    ModelTarget,
    Part,
    Provider,
    StopReason,
    TextPart,
    Usage,
)

logger = structlog.get_logger(__name__)


class InvokeRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    target: ModelTarget
    system: str
    parts: list[Part]
    json_schema: dict[str, Any]
    max_tokens: int
    # Tracing only: LangChain run name and metadata (e.g. "grader.grade", {"question": "Q1"})
    trace_name: Optional[str] = None
    trace_metadata: dict[str, str] = {}


class InvokeResponse(BaseModel):
    text: Optional[str] = None
    parsed: Optional[dict[str, Any]] = None
    parse_error: Optional[str] = None
    stop_reason: StopReason = "end"
    provider_stop_reason: Optional[str] = None
    refusal_detail: Optional[str] = None
    model_answered: Optional[str] = None
    response_id: Optional[str] = None
    request_id: Optional[str] = None
    usage: Usage = Usage()
    raw: dict[str, Any] = {}
    request: dict[str, Any] = {}
    degraded: bool = False
    latency_ms: int = 0


class Invoker(Protocol):
    async def invoke(self, req: InvokeRequest) -> InvokeResponse: ...


# ===== helpers =====

# OpenAI SDK exceptions that are really stop reasons (raised by structured-output parsing)
_OPENAI_FINISH_ERRORS: dict[str, StopReason] = {
    "LengthFinishReasonError": "max_tokens",
    "ContentFilterFinishReasonError": "refusal",
}


def _jsonable(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def _without_nul(value: Any) -> Any:
    """Drop U+0000 from every string. Models write it for symbols they can't read (e.g. a
    private-use glyph in a PDF's text layer), and Postgres rejects it in text and JSONB, which
    would fail the audit write and with it the run."""
    if isinstance(value, str):
        return value.replace("\x00", "")
    if isinstance(value, dict):
        return {_without_nul(k): _without_nul(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_without_nul(v) for v in value]
    return value


def _api_key(target: ModelTarget) -> Optional[str]:
    name = target.resolved_api_key_env
    value = getattr(app_settings, name, None) or os.environ.get(name)
    return value or None


def _content_blocks(parts: list[Part]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for part in parts:
        if isinstance(part, TextPart):
            blocks.append({"type": "text", "text": part.text})
        else:
            blocks.append({"type": "image", "base64": part.data, "mime_type": part.media_type})
    return blocks


def _redacted_parts(parts: list[Part]) -> list[dict[str, Any]]:
    """Request content for audit records: images by reference + hash, never the bytes."""
    out = []
    for part in parts:
        if isinstance(part, ImagePart):
            out.append({"type": "image", "media_type": part.media_type, "ref": part.ref, "sha256": part.sha256})
        else:
            out.append({"type": "text", "text": part.text})
    return out


def _message_text(message: AIMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"
    )


def _usage(message: AIMessage) -> Usage:
    meta = message.usage_metadata or {}
    in_details = meta.get("input_token_details") or {}
    out_details = meta.get("output_token_details") or {}
    cache_read = int(in_details.get("cache_read") or 0)
    cache_write = int(in_details.get("cache_creation") or 0)
    # LangChain's input_tokens include cached tokens; keep uncached input separately for pricing
    return Usage(
        input_tokens=max(int(meta.get("input_tokens") or 0) - cache_read - cache_write, 0),
        output_tokens=int(meta.get("output_tokens") or 0),
        cache_read_tokens=cache_read,
        cache_write_tokens=cache_write,
        reasoning_tokens=int(out_details.get("reasoning") or 0),
    )


def _stop(message: AIMessage, provider: Provider) -> tuple[StopReason, Optional[str], Optional[str]]:
    """Normalize the provider's stop reason. Returns (stop, provider_value, refusal_detail)."""
    meta = message.response_metadata or {}
    if provider == Provider.ANTHROPIC:
        raw = meta.get("stop_reason")
        if raw == "refusal":
            details = meta.get("stop_details") or {}
            return "refusal", raw, (details.get("category") or details.get("explanation")) if isinstance(details, dict) else str(details)
        if raw in ("max_tokens", "model_context_window_exceeded"):
            return "max_tokens", raw, None
        if raw in ("end_turn", "stop_sequence", "tool_use", None):
            return "end", raw, None
        return "other", raw, None

    refusal = (message.additional_kwargs or {}).get("refusal")
    raw = meta.get("finish_reason")
    if refusal:
        return "refusal", raw, str(refusal)
    if raw == "content_filter":
        return "refusal", raw, "content_filter"
    if raw == "length":
        return "max_tokens", raw, None
    if raw in ("stop", "tool_calls", None):
        return "end", raw, None
    return "other", raw, None


def _request_id(message: AIMessage) -> Optional[str]:
    headers = (message.response_metadata or {}).get("headers") or {}
    if isinstance(headers, dict):
        return headers.get("x-request-id") or headers.get("request-id")
    return None


# ===== invoker =====

class LangChainInvoker:
    """Calls models through LangChain chat models. Create one per grading run."""

    def __init__(self) -> None:
        self._models: dict[tuple[str, int], Any] = {}

    def _chat_model(self, target: ModelTarget, max_tokens: int, name: Optional[str] = None) -> Any:
        # `name` labels the model's runs in traces (e.g. "grader.grade"), so dashboards can split by role
        cache_key = (target.key, max_tokens, name)
        if cache_key in self._models:
            return self._models[cache_key]

        api_key = _api_key(target)
        if target.provider == Provider.ANTHROPIC:
            if not api_key:
                raise LLMConfigError(f"{target.resolved_api_key_env} is not set")
            from langchain_anthropic import ChatAnthropic

            kwargs: dict[str, Any] = {
                "model": target.model,
                "max_tokens": max_tokens,
                "api_key": api_key,
                "timeout": target.timeout_s,
                "max_retries": 2,
                "name": name,
            }
            if target.base_url:
                kwargs["base_url"] = target.base_url
            if target.effort:
                kwargs["effort"] = target.effort
            model = ChatAnthropic(**kwargs)
        else:
            if target.provider == Provider.OPENAI and not api_key:
                raise LLMConfigError(f"{target.resolved_api_key_env} is not set")
            from langchain_openai import ChatOpenAI

            model = ChatOpenAI(
                model=target.model,
                max_tokens=max_tokens,
                # vLLM/SGLang usually run without auth; the client still needs a value
                api_key=api_key or "not-needed",
                base_url=target.base_url,
                timeout=target.timeout_s,
                max_retries=2,
                use_responses_api=False,
                include_response_headers=True,
                name=name,
            )
        self._models[cache_key] = model
        return model

    async def invoke(self, req: InvokeRequest) -> InvokeResponse:
        target = req.target
        model = self._chat_model(target, req.max_tokens, req.trace_name)
        degraded = not target.supports_json_schema

        system = req.system
        if degraded:
            system = (
                f"{req.system}\n\nRespond with ONLY a JSON object (no prose, no code fences) that "
                f"matches this JSON schema:\n{json.dumps(req.json_schema)}"
            )
        messages = [SystemMessage(content=system), HumanMessage(content=_content_blocks(req.parts))]

        request_record = {
            "provider": target.provider.value,
            "model": target.model,
            "base_url": target.base_url,
            "params": {"max_tokens": req.max_tokens, "effort": target.effort, "timeout_s": target.timeout_s},
            "system": system,
            "messages": [{"role": "user", "content": _redacted_parts(req.parts)}],
            "structured_output": "prompted" if degraded else "json_schema",
            "output_schema": req.json_schema,
        }

        run_config: dict[str, Any] = {"run_name": req.trace_name, "metadata": req.trace_metadata}
        started = time.monotonic()
        parse_error: Optional[str] = None
        parsed: Optional[dict[str, Any]] = None
        try:
            if degraded:
                raw: AIMessage = await model.ainvoke(messages, config=run_config)
            else:
                structured_kwargs: dict[str, Any] = {"method": "json_schema", "include_raw": True}
                if target.provider != Provider.ANTHROPIC:
                    structured_kwargs["strict"] = True
                runnable = model.with_structured_output(req.json_schema, **structured_kwargs)
                out = await runnable.ainvoke(messages, config=run_config)
                raw = out["raw"]
                parsed = out.get("parsed")
                if out.get("parsing_error") is not None:
                    err = out["parsing_error"]
                    parse_error = f"{type(err).__name__}: {err}"
                    # OpenAI reports structured-output refusals as a parser exception
                    if type(err).__name__ == "OpenAIRefusalError":
                        raw.additional_kwargs.setdefault("refusal", str(err))
        except (LLMConfigError, LLMTransportError):
            raise
        except Exception as e:
            # The OpenAI SDK raises (instead of returning) on truncated or filtered structured output
            finish = _OPENAI_FINISH_ERRORS.get(type(e).__name__)
            if finish is not None:
                return InvokeResponse(
                    stop_reason=finish,
                    provider_stop_reason=type(e).__name__,
                    refusal_detail="content_filter" if finish == "refusal" else None,
                    model_answered=target.model,
                    request=request_record,
                    raw={"error": f"{type(e).__name__}: {e}"},
                    degraded=degraded,
                    latency_ms=int((time.monotonic() - started) * 1000),
                )
            # SDK/network errors after the SDK's own retries, timeouts, auth errors
            raise LLMTransportError(f"{type(e).__name__}: {e}") from e
        latency_ms = int((time.monotonic() - started) * 1000)

        text = _message_text(raw)
        if degraded and text:
            try:
                parsed = extract_json_object(text)
            except LLMOutputInvalid as e:
                parse_error = str(e)

        stop, provider_stop, refusal_detail = _stop(raw, target.provider)
        meta = raw.response_metadata or {}
        return InvokeResponse(
            text=_without_nul(text),
            parsed=_without_nul(parsed) if isinstance(parsed, dict) else None,
            parse_error=_without_nul(parse_error),
            stop_reason=stop,
            provider_stop_reason=provider_stop,
            refusal_detail=refusal_detail,
            model_answered=meta.get("model_name") or meta.get("model"),
            response_id=meta.get("id") or raw.id,
            request_id=_request_id(raw),
            usage=_usage(raw),
            raw=_without_nul(
                _jsonable(
                    {
                        "content": raw.content,
                        "response_metadata": meta,
                        "usage_metadata": raw.usage_metadata,
                        "additional_kwargs": raw.additional_kwargs,
                    }
                )
            ),
            request=request_record,
            degraded=degraded,
            latency_ms=latency_ms,
        )

"""Core types for the model router: roles, targets, requests, results and attempt records."""

from __future__ import annotations

import hashlib
from datetime import datetime
from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import utcnow


class Role(str, Enum):
    """What an LLM call is for. Each role has its own target + fallback chain."""

    VISION = "vision"
    RUBRIC_PARSER = "rubric_parser"
    GRADER = "grader"
    EVALUATOR = "evaluator"


class Provider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    # Self-hosted open-weight models behind an OpenAI-compatible server (vLLM, SGLang;
    # Ollama for local development only)
    OPENWEIGHT = "openweight"


DEFAULT_API_KEY_ENV = {
    Provider.ANTHROPIC: "ANTHROPIC_API_KEY",
    Provider.OPENAI: "OPENAI_API_KEY",
    Provider.OPENWEIGHT: "OPENWEIGHT_API_KEY",
}


class ModelTarget(BaseModel):
    """One concrete model endpoint a role can call."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    provider: Provider
    model: str
    base_url: Optional[str] = None
    api_key_env: Optional[str] = None  # defaults per provider (DEFAULT_API_KEY_ENV)
    effort: Optional[Literal["low", "medium", "high", "xhigh", "max"]] = None  # Claude only
    max_tokens: int = 8192
    timeout_s: float = 180.0
    # Whether data sent to this target leaves our infrastructure. Defaults: API providers yes,
    # open-weight no (override for hosted open-weight endpoints).
    external: Optional[bool] = None
    supports_vision: bool = True
    supports_json_schema: bool = True
    # Open-weight provenance, recorded on every call for audit/fairness
    model_revision: Optional[str] = None
    quantization: Optional[str] = None

    @property
    def is_external(self) -> bool:
        if self.external is not None:
            return self.external
        return self.provider != Provider.OPENWEIGHT

    @property
    def resolved_api_key_env(self) -> str:
        return self.api_key_env or DEFAULT_API_KEY_ENV[self.provider]

    @property
    def key(self) -> str:
        """Stable identity used for exclusions and logging."""
        return f"{self.provider.value}:{self.model}@{self.base_url or 'default'}"


class TextPart(BaseModel):
    type: Literal["text"] = "text"
    text: str


class ImagePart(BaseModel):
    type: Literal["image"] = "image"
    data: str  # base64
    media_type: str
    ref: Optional[str] = None  # where the image lives (file path / storage key) for audit records

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.data.encode("ascii")).hexdigest()


Part = TextPart | ImagePart


class CallContext(BaseModel):
    """Who/why a call is made; copied onto every attempt record."""

    purpose: str  # e.g. "ocr_answers", "grade", "evaluate", "tag"
    run_id: Optional[UUID] = None
    submission_id: Optional[UUID] = None
    question_id: Optional[str] = None
    round: Optional[int] = None


S = TypeVar("S", bound=BaseModel)


class LLMRequest(BaseModel, Generic[S]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    role: Role
    system: str
    parts: list[Part]
    output_schema: type[S]
    context: CallContext
    max_tokens: Optional[int] = None  # overrides the target's default
    exclude_models: frozenset[str] = frozenset()  # model names this call's fallbacks must not use

    @property
    def schema_name(self) -> str:
        return self.output_schema.__name__

    @property
    def has_images(self) -> bool:
        return any(isinstance(p, ImagePart) for p in self.parts)


AttemptKind = Literal["initial", "repair", "truncation_retry", "fallback"]
StopReason = Literal["end", "max_tokens", "refusal", "error", "other"]


class Usage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    reasoning_tokens: int = 0


class AttemptRecord(BaseModel):
    """One HTTP call to one model. Every attempt is recorded, including failures."""

    role: Role
    context: CallContext
    attempt_no: int
    attempt_kind: AttemptKind
    provider: Provider
    model_requested: str
    model_answered: Optional[str] = None
    base_url: Optional[str] = None
    external: bool
    model_revision: Optional[str] = None
    quantization: Optional[str] = None
    request: dict[str, Any]  # rendered system/messages/params; images by reference + sha256
    response_raw: Optional[dict[str, Any]] = None
    parsed: Optional[dict[str, Any]] = None
    stop_reason: Optional[StopReason] = None
    provider_stop_reason: Optional[str] = None
    refusal_detail: Optional[str] = None
    response_id: Optional[str] = None
    request_id: Optional[str] = None
    usage: Usage = Field(default_factory=Usage)
    cost_usd: Optional[float] = None
    latency_ms: int = 0
    schema_name: str
    schema_hash: str
    degraded: bool = False  # schema enforced by prompt + validation only
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    fallback_reason: Optional[str] = None  # why the previous target was abandoned
    started_at: datetime = Field(default_factory=utcnow)


class LLMResult(BaseModel, Generic[S]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    parsed: S
    target: ModelTarget
    model_answered: Optional[str]
    attempts: list[AttemptRecord]
    fallback_used: bool = False
    fallback_reason: Optional[str] = None

    @property
    def cost_usd(self) -> float:
        return sum(a.cost_usd or 0.0 for a in self.attempts)


# ===== Errors =====

class LLMError(RuntimeError):
    """Base class for router errors."""


class LLMTargetError(LLMError):
    """A single target failed; the router moves on to the next one."""

    reason = "error"


class LLMRefusal(LLMTargetError):
    reason = "refusal"


class LLMTruncated(LLMTargetError):
    reason = "truncated"


class LLMOutputInvalid(LLMTargetError):
    reason = "invalid_output"


class LLMTransportError(LLMTargetError):
    reason = "transport_error"


class LLMConfigError(LLMTargetError):
    reason = "config_error"


class LLMAllTargetsFailed(LLMError):
    """Every target in the role's chain failed."""

    def __init__(self, role: Role, attempts: list[AttemptRecord], reasons: list[str]):
        self.role = role
        self.attempts = attempts
        self.reasons = reasons
        super().__init__(f"All models failed for role '{role.value}': {'; '.join(reasons)}")

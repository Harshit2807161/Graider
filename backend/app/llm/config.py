"""Per-role model configuration.

Every role has a primary target and an ordered fallback list. Configure with nested env vars,
e.g. (see backend/.env.example for full profiles):

    LLM__GRADER__PROVIDER=openweight
    LLM__GRADER__MODEL=Qwen/Qwen3-32B
    LLM__GRADER__BASE_URL=http://vllm:8000/v1
    LLM__GRADER__FALLBACKS=[{"provider": "anthropic", "model": "claude-sonnet-5-5", "effort": "medium"}]
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.llm.types import ModelTarget, Provider, Role


class RoleConfig(ModelTarget):
    """The role's primary target (inherited fields) plus its fallbacks, in order."""

    fallbacks: list[ModelTarget] = []

    @property
    def primary(self) -> ModelTarget:
        return ModelTarget(**self.model_dump(exclude={"fallbacks"}))

    @property
    def chain(self) -> list[ModelTarget]:
        return [self.primary, *self.fallbacks]


class ModelPrice(BaseModel):
    """USD per million tokens."""

    model_config = ConfigDict(extra="forbid")

    input: float
    output: float
    cache_read: Optional[float] = None
    cache_write: Optional[float] = None


def _claude(model: str, effort: str, max_tokens: int) -> RoleConfig:
    return RoleConfig(provider=Provider.ANTHROPIC, model=model, effort=effort, max_tokens=max_tokens)


class LLMSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="LLM__",
        env_nested_delimiter="__",
        env_file=None if os.environ.get("GR8R_IGNORE_ENV_FILE") else ".env",
        extra="ignore",
        case_sensitive=False,
    )

    # Shipped defaults need only ANTHROPIC_API_KEY. Effort is explicit: Opus 5.5 defaults to medium.
    vision: RoleConfig = _claude("claude-opus-5-5", "high", 16000)
    rubric_parser: RoleConfig = _claude("claude-opus-5-5", "high", 8000)
    grader: RoleConfig = _claude("claude-sonnet-5-5", "medium", 8000)
    evaluator: RoleConfig = _claude("claude-opus-5-5", "high", 8000)

    # May a self-hosted primary fall back to an external API (student data leaves our infra)?
    allow_external_fallback: bool = True

    # Runaway-cost guard per submission: calls = base + per_question * questions; plus a USD cap
    max_calls_base: int = 20
    max_calls_per_question: int = 12
    max_cost_usd_per_submission: float = 10.0

    # Extra/override prices, e.g. LLM__PRICES={"my-model": {"input": 1, "output": 2}}
    prices: dict[str, ModelPrice] = {}

    @model_validator(mode="after")
    def _vision_targets_need_vision(self) -> "LLMSettings":
        for target in self.vision.chain:
            if not target.supports_vision:
                raise ValueError(f"vision role target {target.key} has supports_vision=false")
        return self

    def independence_warnings(self) -> list[str]:
        """Config smells that weaken the grader/evaluator independence (fresh eyes)."""
        warnings: list[str] = []
        g, e = self.grader.primary, self.evaluator.primary
        if (g.provider, g.model) == (e.provider, e.model):
            warnings.append(
                f"grader and evaluator share the same primary model ({g.provider.value}:{g.model}); "
                "the evaluator's independent second look is weakened"
            )
        return warnings

    def role(self, role: Role) -> RoleConfig:
        return getattr(self, role.value)

    def max_calls_for(self, question_count: int) -> int:
        return self.max_calls_base + self.max_calls_per_question * max(question_count, 1)


@lru_cache
def get_llm_settings() -> LLMSettings:
    return LLMSettings()

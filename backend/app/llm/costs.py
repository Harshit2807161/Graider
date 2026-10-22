"""Token prices (USD per million tokens) and per-attempt cost calculation."""

from typing import Optional

import structlog

from app.llm.config import LLMSettings, ModelPrice, get_llm_settings
from app.llm.types import ModelTarget, Provider, Role, Usage

logger = structlog.get_logger(__name__)

# Claude API list prices (Oct 2026). Cache writes are 1.25x input (5-minute TTL).
DEFAULT_PRICES: dict[str, ModelPrice] = {
    "claude-opus-5-5": ModelPrice(input=4.0, output=20.0, cache_read=0.20, cache_write=5.0),
    "claude-sonnet-5-5": ModelPrice(input=2.0, output=10.0, cache_read=0.20, cache_write=2.5),
    "claude-haiku-5-5": ModelPrice(input=0.10, output=0.50, cache_read=0.01, cache_write=0.125),
    "claude-haiku-4-5": ModelPrice(input=1.0, output=5.0, cache_read=0.10, cache_write=1.25),
}

_warned: set[str] = set()


class UnpricedModelError(ValueError):
    """An API model has no price, so its spend would escape the per-submission USD cap."""


def price_for(model: str, settings: Optional[LLMSettings] = None) -> Optional[ModelPrice]:
    overrides = (settings or get_llm_settings()).prices
    return overrides.get(model) or DEFAULT_PRICES.get(model)


def unpriced_api_targets(config: LLMSettings) -> list[str]:
    """Keys of every primary/fallback API target (anthropic, openai) with no known price."""
    missing: list[str] = []
    for role in Role:
        for target in config.role(role).chain:
            if target.provider == Provider.OPENWEIGHT or price_for(target.model, config) is not None:
                continue
            if target.key not in missing:
                missing.append(target.key)
    return missing


def check_prices(config: LLMSettings) -> None:
    """Raise UnpricedModelError for unpriced API models unless LLM__ALLOW_UNPRICED_MODELS=true."""
    if config.allow_unpriced_models:
        return
    missing = unpriced_api_targets(config)
    if missing:
        raise UnpricedModelError(
            f"no price for API model(s) {', '.join(missing)}: their cost would not count toward "
            "LLM__MAX_COST_USD_PER_SUBMISSION. Add them to LLM__PRICES, or set "
            "LLM__ALLOW_UNPRICED_MODELS=true to accept uncapped spend."
        )


def cost_usd(target: ModelTarget, usage: Usage) -> Optional[float]:
    """Cost of one attempt. Self-hosted open-weight is free unless a price is configured.

    Returns None (and warns once) when an API model has no known price.
    """
    price = price_for(target.model)
    if price is None:
        if target.provider == Provider.OPENWEIGHT:
            return 0.0
        if target.model not in _warned:
            _warned.add(target.model)
            logger.warning("llm_price_unknown", model=target.model)
        return None

    cache_read = price.cache_read if price.cache_read is not None else price.input
    cache_write = price.cache_write if price.cache_write is not None else price.input
    # Anthropic reports cache tokens separately from input_tokens
    total = (
        usage.input_tokens * price.input
        + usage.output_tokens * price.output
        + usage.cache_read_tokens * cache_read
        + usage.cache_write_tokens * cache_write
    )
    return round(total / 1_000_000, 6)

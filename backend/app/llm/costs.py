"""Token prices (USD per million tokens) and per-attempt cost calculation."""

from typing import Optional

import structlog

from app.llm.config import ModelPrice, get_llm_settings
from app.llm.types import ModelTarget, Provider, Usage

logger = structlog.get_logger(__name__)

# Claude API list prices (Oct 2026). Cache writes are 1.25x input (5-minute TTL).
DEFAULT_PRICES: dict[str, ModelPrice] = {
    "claude-opus-5-5": ModelPrice(input=4.0, output=20.0, cache_read=0.20, cache_write=5.0),
    "claude-sonnet-5-5": ModelPrice(input=2.0, output=10.0, cache_read=0.20, cache_write=2.5),
    "claude-haiku-4-5": ModelPrice(input=1.0, output=5.0, cache_read=0.10, cache_write=1.25),
}

_warned: set[str] = set()


def price_for(model: str) -> Optional[ModelPrice]:
    overrides = get_llm_settings().prices
    return overrides.get(model) or DEFAULT_PRICES.get(model)


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

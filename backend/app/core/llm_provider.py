"""
Provider-agnostic LLM abstraction layer.

Supports OpenAI and Anthropic. Switch providers via LLM_PROVIDER in .env.
"""

import asyncio
import json
import re
from abc import ABC, abstractmethod
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class LLMResponseError(ValueError):
    """The model's response could not be used (refusal, truncation, or unparseable output)."""


def extract_json_object(text: str) -> dict[str, Any]:
    """
    Parse the JSON object in a model response.

    Accepts bare JSON, JSON in a ```json fence, or JSON surrounded by prose.
    Raises LLMResponseError if no JSON object can be parsed.
    """
    candidate = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", candidate, re.DOTALL)
    if fence:
        candidate = fence.group(1).strip()
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start == -1 or end <= start:
            raise LLMResponseError(f"No JSON object in model response: {text[:200]!r}")
        try:
            data = json.loads(candidate[start:end + 1])
        except json.JSONDecodeError as e:
            raise LLMResponseError(f"Invalid JSON in model response: {e}") from e
    if not isinstance(data, dict):
        raise LLMResponseError("Model response JSON is not an object")
    return data


class LLMProvider(ABC):
    """Abstract base for all LLM providers."""

    @abstractmethod
    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        ...

    # The SDK clients used below are synchronous; run them in a worker thread so
    # async callers (graders, OCR) don't block the event loop.
    async def achat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        return await asyncio.to_thread(self.chat, system_prompt, user_prompt, max_tokens)

    async def achat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        return await asyncio.to_thread(self.chat_vision, prompt, content_blocks, max_tokens)

    @abstractmethod
    def chat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        """
        Send a vision request with multiple content blocks (images/text).
        
        Args:
            prompt: Optional system prompt or instructions.
            content_blocks: List of dicts with 'type' ('text' or 'image').
               - 'text': {'type': 'text', 'text': '...'}
               - 'image': {'type': 'image', 'data': 'base64...', 'media_type': 'image/jpeg'}
        """
        ...


class OpenAIProvider(LLMProvider):
    """OpenAI (GPT) provider."""

    # Reasoning models (gpt-5*, o-series) spend part of max_completion_tokens on hidden
    # reasoning; small caps (e.g. 256 for tagging) can leave nothing for the answer.
    REASONING_MIN_COMPLETION_TOKENS = 4096

    def __init__(self, api_key: str, model: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    @property
    def _is_reasoning_model(self) -> bool:
        name = self.model.lower()
        return name.startswith(("o1", "o3", "o4")) or "gpt-5" in name

    def _system_role(self) -> str:
        # Reasoning models prefer the 'developer' role over 'system'
        return "developer" if self._is_reasoning_model else "system"

    def _completion_tokens(self, max_tokens: int) -> int:
        if self._is_reasoning_model:
            return max(max_tokens, self.REASONING_MIN_COMPLETION_TOKENS)
        return max_tokens

    def _complete(self, messages: list[dict], max_tokens: int, json_mode: bool = False) -> str:
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_completion_tokens": self._completion_tokens(max_tokens),
            "messages": messages,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        content = (choice.message.content or "").strip()
        if not content:
            raise LLMResponseError(
                f"Model returned no content (finish_reason={choice.finish_reason})"
            )
        if choice.finish_reason == "length":
            raise LLMResponseError("Model response was truncated (hit max_completion_tokens)")
        logger.debug("llm_response", model=self.model, content_preview=content[:200])
        return content

    def chat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        messages = []
        if prompt:
            messages.append({"role": self._system_role(), "content": prompt})

        oai_content = []
        for block in content_blocks:
            if block["type"] == "text":
                oai_content.append({"type": "text", "text": block["text"]})
            elif block["type"] == "image":
                oai_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{block['media_type']};base64,{block['data']}"
                    }
                })

        messages.append({"role": "user", "content": oai_content})
        return self._complete(messages, max_tokens)

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        messages = [
            {"role": self._system_role(), "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        # JSON mode requires the word "JSON" to appear in the messages
        json_mode = "JSON" in system_prompt.upper()
        return self._complete(messages, max_tokens, json_mode=json_mode)


class AnthropicProvider(LLMProvider):
    """Anthropic (Claude) provider."""

    def __init__(self, api_key: str, model: str):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def chat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        anth_content = []
        for block in content_blocks:
            if block["type"] == "text":
                anth_content.append({"type": "text", "text": block["text"]})
            elif block["type"] == "image":
                anth_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": block["media_type"],
                        "data": block["data"],
                    },
                })
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=prompt,
            messages=[{"role": "user", "content": anth_content}],
        )
        return self._text_from(response)

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return self._text_from(response)

    def _text_from(self, response: Any) -> str:
        # Current Claude models may return thinking blocks before the text block,
        # so content[0] is not necessarily text.
        if response.stop_reason == "refusal":
            raise LLMResponseError("Model declined the request (stop_reason=refusal)")
        if response.stop_reason == "max_tokens":
            raise LLMResponseError("Model response was truncated (hit max_tokens)")
        text = "".join(block.text for block in response.content if block.type == "text")
        return text.strip()


# ===== Factory =====

_grader_provider: LLMProvider | None = None
_orchestrator_provider: LLMProvider | None = None
_vision_provider: LLMProvider | None = None

def get_llm_provider(role: str = "grader") -> LLMProvider:
    """
    Get the LLM provider instance for a given role.

    Args:
        role: "grader", "orchestrator", or "vision" — determines which model config to use.

    Returns:
        An LLMProvider instance.
    """
    global _grader_provider, _orchestrator_provider, _vision_provider

    if role == "grader" and _grader_provider is not None:
        return _grader_provider
    if role == "orchestrator" and _orchestrator_provider is not None:
        return _orchestrator_provider
    if role == "vision" and _vision_provider is not None:
        return _vision_provider

    from app.core.config import get_settings
    settings = get_settings()

    provider_name = settings.LLM_PROVIDER.lower()
    if role == "grader":
        model = settings.LLM_GRADER_MODEL
    elif role == "orchestrator":
        model = settings.LLM_ORCHESTRATOR_MODEL
    else: # vision
        model = settings.LLM_VISION_MODEL

    if provider_name == "openai":
        provider = OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=model)
    elif provider_name == "anthropic":
        provider = AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY, model=model)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: '{provider_name}'. Use 'openai' or 'anthropic'.")

    logger.info("llm_provider_initialized", provider=provider_name, role=role, model=model)

    if role == "grader":
        _grader_provider = provider
    elif role == "orchestrator":
        _orchestrator_provider = provider
    else:
        _vision_provider = provider

    return provider

"""
Provider-agnostic LLM abstraction layer.

Supports OpenAI and Anthropic. Switch providers via LLM_PROVIDER in .env.
"""

from abc import ABC, abstractmethod
import structlog

logger = structlog.get_logger(__name__)


class LLMProvider(ABC):
    """Abstract base for all LLM providers."""

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

    def __init__(self, api_key: str, model: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def chat_vision(self, prompt: str, content_blocks: list[dict], max_tokens: int = 4096) -> str:
        messages = []
        if prompt:
            # Some newer models prefer 'developer' role over 'system' 
            role = "developer" if "o1" in self.model.lower() or "gpt-5" in self.model.lower() else "system"
            messages.append({"role": role, "content": prompt})
        
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
        
        response = self.client.chat.completions.create(
            model=self.model,
            max_completion_tokens=max_tokens,
            messages=messages,
        )
        content = response.choices[0].message.content or ""
        logger.debug("llm_vision_response", model=self.model, content_preview=content[:200])
        return content.strip()

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        # Some newer models prefer 'developer' role over 'system'
        role = "developer" if "o1" in self.model.lower() or "gpt-5" in self.model.lower() else "system"
        
        # Use JSON mode if requested in system prompt
        response_format = {"type": "json_object"} if "JSON" in system_prompt.upper() else None
        
        response = self.client.chat.completions.create(
            model=self.model,
            max_completion_tokens=max_tokens,
            response_format=response_format,
            messages=[
                {"role": role, "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content or ""
        # If no content, try reasoning_content (for some o1 models)
        if not content and hasattr(response.choices[0].message, 'reasoning_content'):
            content = getattr(response.choices[0].message, 'reasoning_content') or ""
            
        logger.debug("llm_chat_response", model=self.model, content_preview=content[:200])
        return content.strip()


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
        return response.content[0].text.strip()

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 2048) -> str:
        # ... (unchanged)
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text.strip()


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

"""Model router: per-role model selection, fallback (open-weight ⇄ API), structured output, audit.

Use `get_router().call(LLMRequest[...](...))` for every LLM call. See docs/proposals/002.
"""

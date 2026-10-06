"""Output-schema helpers shared by all backends.

`portable_schema` turns a Pydantic output model into a strict JSON schema that Claude
structured outputs, OpenAI strict json_schema and vLLM/SGLang guided decoding all accept:
refs inlined, every object closed (additionalProperties: false) with all properties required,
`const` rewritten as a one-value `enum`, and validation keywords some backends reject
(numeric/string bounds, defaults) removed.
Bounds are still enforced afterwards: by Pydantic validation and by the grading code checks.
"""

import hashlib
import json
from typing import Any

from pydantic import BaseModel

from app.llm.types import LLMOutputInvalid

_DROP_KEYS = {
    "default",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minItems",
    "maxItems",
    "uniqueItems",
    "examples",
}


def _inline(node: Any, defs: dict[str, Any]) -> Any:
    if isinstance(node, dict):
        if "$ref" in node:
            name = node["$ref"].rsplit("/", 1)[-1]
            merged = {**_inline(defs[name], defs), **{k: v for k, v in node.items() if k != "$ref"}}
            return _inline(merged, defs)
        out = {k: _inline(v, defs) for k, v in node.items() if k not in _DROP_KEYS and k != "$defs"}
        # Single-value Literal becomes `const`, which not every backend's structured output supports
        if "const" in out:
            out["enum"] = [out.pop("const")]
        if out.get("type") == "object" and "properties" in out:
            out["additionalProperties"] = False
            out["required"] = list(out["properties"].keys())
        return out
    if isinstance(node, list):
        return [_inline(v, defs) for v in node]
    return node


def portable_schema(model: type[BaseModel]) -> dict[str, Any]:
    raw = model.model_json_schema()
    schema = _inline(raw, raw.get("$defs", {}))
    schema["title"] = model.__name__
    return schema


def schema_hash(schema: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(schema, sort_keys=True).encode()).hexdigest()[:16]


def extract_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from model text (used only on the degraded, prompt-only path).

    Accepts bare JSON, JSON inside a ``` fence, or JSON surrounded by prose.
    """
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.lower().startswith("json"):
            candidate = candidate[4:]
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start == -1 or end <= start:
            raise LLMOutputInvalid(f"No JSON object in model output: {text[:200]!r}")
        try:
            data = json.loads(candidate[start:end + 1])
        except json.JSONDecodeError as e:
            raise LLMOutputInvalid(f"Invalid JSON in model output: {e}") from e
    if not isinstance(data, dict):
        raise LLMOutputInvalid("Model output JSON is not an object")
    return data

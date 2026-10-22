"""The claude_cli provider, against a fake `claude` executable (no CLI or account needed)."""

import json
import stat
import sys

import pytest

from app.llm import claude_cli
from app.llm.invoker import InvokeRequest, LangChainInvoker
from app.llm.types import ImagePart, LLMTransportError, ModelTarget, Provider, TextPart

SCHEMA = {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}

# Echoes its argv, its environment and the stdin message back inside a stream-json result event
FAKE = """\
import json, os, sys
message = json.loads(sys.stdin.readline())
mode = os.environ.get("FAKE_MODE", "ok")
if mode == "crash":
    sys.stderr.write("not signed in"); sys.exit(1)
result = {
    "type": "result", "subtype": "success", "is_error": False, "stop_reason": "tool_use",
    "result": "{}", "session_id": "s1", "uuid": "u1",
    "usage": {"input_tokens": 10, "output_tokens": 5, "cache_read_input_tokens": 2, "cache_creation_input_tokens": 3},
    "modelUsage": {"claude-sonnet-5-5": {}},
    "structured_output": None if mode == "no_output" else {"answer": json.dumps({
        "argv": sys.argv[1:], "has_api_key": "ANTHROPIC_API_KEY" in os.environ,
        "content_types": [c["type"] for c in message["message"]["content"]]})},
}
print(json.dumps({"type": "system", "subtype": "init"}))
print(json.dumps(result))
"""


@pytest.fixture
def fake_cli(tmp_path, monkeypatch):
    script = tmp_path / "claude"
    script.write_text(f"#!{sys.executable}\n{FAKE}")
    script.chmod(script.stat().st_mode | stat.S_IEXEC)
    monkeypatch.setattr(claude_cli, "CLI", str(script))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-must-not-be-passed")
    return monkeypatch


def request() -> InvokeRequest:
    target = ModelTarget(provider=Provider.CLAUDE_CLI, model="claude-sonnet-5-5", effort="medium")
    parts = [ImagePart(data="aGVsbG8=", media_type="image/png", ref="page-1"), TextPart(text="Read it")]
    return InvokeRequest(target=target, system="You read pages.", parts=parts, json_schema=SCHEMA, max_tokens=100)


async def test_cli_call_returns_structured_output_usage_and_a_redacted_request(fake_cli):
    resp = await LangChainInvoker().invoke(request())

    echoed = json.loads(resp.parsed["answer"])
    assert echoed["content_types"] == ["image", "text"]
    assert not echoed["has_api_key"]  # never bills an API key
    argv = echoed["argv"]
    assert argv[argv.index("--model") + 1] == "claude-sonnet-5-5" and argv[argv.index("--effort") + 1] == "medium"
    assert json.loads(argv[argv.index("--json-schema") + 1]) == SCHEMA
    assert argv[argv.index("--tools") + 1] == ""
    assert resp.stop_reason == "end" and resp.model_answered == "claude-sonnet-5-5"
    assert (resp.usage.input_tokens, resp.usage.output_tokens, resp.usage.cache_read_tokens) == (10, 5, 2)
    assert "aGVsbG8=" not in json.dumps(resp.request)  # image bytes are not recorded


async def test_missing_structured_output_is_a_parse_error(fake_cli):
    fake_cli.setenv("FAKE_MODE", "no_output")
    resp = await LangChainInvoker().invoke(request())
    assert resp.parsed is None and resp.parse_error


async def test_a_failing_cli_is_a_transport_error(fake_cli):
    fake_cli.setenv("FAKE_MODE", "crash")
    with pytest.raises(LLMTransportError, match="not signed in"):
        await LangChainInvoker().invoke(request())

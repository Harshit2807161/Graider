"""Contract tests: the real LangChainInvoker against local stub servers shaped like the
Anthropic Messages API and an OpenAI-compatible server (vLLM/SGLang/OpenAI).

They pin down the request we send (structured output, no sampling params / forced tools,
image blocks) and how responses map back (text, parsed output, stop reasons, usage, ids).
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

from app.llm.invoker import InvokeRequest, LangChainInvoker
from app.llm.schema import portable_schema
from app.llm.types import ImagePart, LLMConfigError, LLMTransportError, ModelTarget, Provider, TextPart
from tests.test_llm_router import Answer

PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"


class StubServer:
    """Serves one canned JSON response per path and records requests."""

    def __init__(self):
        self.responses: dict[str, tuple[int, dict[str, Any], dict[str, str]]] = {}
        self.requests: list[dict[str, Any]] = []
        stub = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                length = int(self.headers.get("content-length", 0))
                body = json.loads(self.rfile.read(length) or b"{}")
                stub.requests.append(
                    {"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body}
                )
                status, payload, headers = stub.responses[self.path]
                data = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("content-type", "application/json")
                self.send_header("content-length", str(len(data)))
                for k, v in headers.items():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()


@pytest.fixture
def stub():
    server = StubServer()
    yield server
    server.close()


def anthropic_message(content: list[dict], stop_reason: str = "end_turn", **extra) -> dict:
    return {
        "id": "msg_01",
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-5-5",
        "content": content,
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 120, "output_tokens": 30, "cache_read_input_tokens": 0,
                  "cache_creation_input_tokens": 0},
        **extra,
    }


def chat_completion(content: str, finish_reason: str = "stop", model: str = "Qwen/Qwen3-32B") -> dict:
    return {
        "id": "chatcmpl-1",
        "object": "chat.completion",
        "created": 1,
        "model": model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": finish_reason}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120},
    }


def make_request(target: ModelTarget, images: bool = True) -> InvokeRequest:
    parts: list = [TextPart(text="Grade this answer.")]
    if images:
        parts.append(ImagePart(data=PNG_B64, media_type="image/png", ref="page_000.png"))
    return InvokeRequest(
        target=target, system="You are a grader.", parts=parts, json_schema=portable_schema(Answer), max_tokens=2000
    )


# ===== Anthropic =====

@pytest.fixture
def claude(stub, monkeypatch) -> ModelTarget:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return ModelTarget(provider=Provider.ANTHROPIC, model="claude-sonnet-5-5", base_url=stub.url, effort="medium")


async def test_anthropic_request_uses_native_structured_output(stub, claude):
    stub.responses["/v1/messages"] = (
        200,
        anthropic_message([
            {"type": "thinking", "thinking": "", "signature": "sig"},
            {"type": "text", "text": '{"value": 42}'},
        ]),
        {"request-id": "req_abc"},
    )

    resp = await LangChainInvoker().invoke(make_request(claude))

    body = stub.requests[0]["body"]
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert body["output_config"]["effort"] == "medium"
    assert body["max_tokens"] == 2000
    for forbidden in ("temperature", "top_p", "top_k", "tool_choice"):
        assert forbidden not in body
    assert body["messages"][-1]["role"] == "user"
    image = next(b for b in body["messages"][-1]["content"] if b["type"] == "image")
    assert image["source"] == {"type": "base64", "media_type": "image/png", "data": PNG_B64}

    assert resp.parsed == {"value": 42}
    assert resp.text == '{"value": 42}'  # thinking blocks are not part of the text
    assert (resp.stop_reason, resp.model_answered, resp.response_id) == ("end", "claude-sonnet-5-5", "msg_01")
    assert (resp.usage.input_tokens, resp.usage.output_tokens) == (120, 30)
    # The audit copy of the request never contains image bytes
    recorded_image = resp.request["messages"][0]["content"][1]
    assert recorded_image["ref"] == "page_000.png" and "data" not in recorded_image and recorded_image["sha256"]


async def test_anthropic_refusal_is_detected(stub, claude):
    stub.responses["/v1/messages"] = (
        200,
        anthropic_message([], stop_reason="refusal", stop_details={"type": "refusal", "category": "cyber",
                                                                  "explanation": None}),
        {},
    )
    resp = await LangChainInvoker().invoke(make_request(claude, images=False))
    assert resp.stop_reason == "refusal" and resp.refusal_detail == "cyber"
    assert resp.parsed is None


async def test_anthropic_truncation_is_detected(stub, claude):
    stub.responses["/v1/messages"] = (200, anthropic_message([{"type": "text", "text": '{"val'}], "max_tokens"), {})
    resp = await LangChainInvoker().invoke(make_request(claude, images=False))
    assert resp.stop_reason == "max_tokens"


async def test_anthropic_auth_error_is_a_transport_error(stub, claude):
    stub.responses["/v1/messages"] = (
        401, {"type": "error", "error": {"type": "authentication_error", "message": "invalid x-api-key"}}, {}
    )
    with pytest.raises(LLMTransportError, match="AuthenticationError"):
        await LangChainInvoker().invoke(make_request(claude, images=False))


async def test_missing_anthropic_key_is_a_config_error(stub, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    target = ModelTarget(provider=Provider.ANTHROPIC, model="claude-sonnet-5-5", base_url=stub.url)
    with pytest.raises(LLMConfigError, match="ANTHROPIC_API_KEY"):
        await LangChainInvoker().invoke(make_request(target, images=False))


# ===== OpenAI-compatible (self-hosted open-weight: vLLM / SGLang) =====

@pytest.fixture
def qwen(stub) -> ModelTarget:
    return ModelTarget(provider=Provider.OPENWEIGHT, model="Qwen/Qwen3-32B", base_url=f"{stub.url}/v1",
                       model_revision="abc123", quantization="fp8")


async def test_open_weight_request_uses_strict_json_schema(stub, qwen):
    stub.responses["/v1/chat/completions"] = (200, chat_completion('{"value": 42}'), {"x-request-id": "vllm-req-1"})

    resp = await LangChainInvoker().invoke(make_request(qwen))

    req = stub.requests[0]
    body = req["body"]
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["strict"] is True
    assert body["response_format"]["json_schema"]["schema"]["properties"]["value"]["type"] == "integer"
    for forbidden in ("temperature", "top_p", "tool_choice"):
        assert forbidden not in body
    assert body["messages"][0]["role"] == "system"
    image = next(b for b in body["messages"][-1]["content"] if b["type"] == "image_url")
    assert image["image_url"]["url"].startswith("data:image/png;base64,")
    assert req["headers"]["authorization"] == "Bearer not-needed"  # vLLM without auth

    assert resp.parsed == {"value": 42}
    assert (resp.model_answered, resp.request_id, resp.stop_reason) == ("Qwen/Qwen3-32B", "vllm-req-1", "end")
    assert resp.usage.input_tokens == 100


async def test_open_weight_truncation_is_detected(stub, qwen):
    stub.responses["/v1/chat/completions"] = (200, chat_completion('{"va', finish_reason="length"), {})
    resp = await LangChainInvoker().invoke(make_request(qwen, images=False))
    assert resp.stop_reason == "max_tokens"


async def test_server_without_schema_support_uses_prompted_json(stub, qwen):
    degraded = qwen.model_copy(update={"supports_json_schema": False})
    stub.responses["/v1/chat/completions"] = (200, chat_completion('Sure!\n```json\n{"value": 7}\n```'), {})

    resp = await LangChainInvoker().invoke(make_request(degraded, images=False))

    body = stub.requests[0]["body"]
    assert "response_format" not in body
    assert '"value"' in body["messages"][0]["content"]  # schema is in the system prompt
    assert resp.degraded and resp.parsed == {"value": 7}

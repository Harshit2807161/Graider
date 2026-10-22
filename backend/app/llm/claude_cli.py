"""Claude through the Claude Code CLI (`claude -p`), for running evals on a Claude subscription.

One request is one `claude -p` subprocess with no tools, our system prompt, the parts as a
stream-json user message (images inline) and the output schema as `--json-schema`. The CLI is
signed in to a claude.ai account; ANTHROPIC_API_KEY is removed from its environment so it never
falls back to billing an API key. Costs are recorded at list prices (what the calls would cost
on the API), so the per-submission USD cap still limits a run. Not for production: it needs the
CLI installed and signed in on the worker's machine.
"""

import asyncio
import json
import os
import tempfile
import time
from typing import Any, Optional

from app.llm.types import ImagePart, LLMTransportError, StopReason, TextPart, Usage

CLI = os.environ.get("GR8R_CLAUDE_CLI", "claude")

_STOP: dict[Optional[str], StopReason] = {
    "end_turn": "end",
    "tool_use": "end",  # structured output arrives through the CLI's own output tool
    "stop_sequence": "end",
    None: "end",
    "max_tokens": "max_tokens",
    "model_context_window_exceeded": "max_tokens",
    "refusal": "refusal",
}


def _user_message(parts: list) -> str:
    content: list[dict[str, Any]] = []
    for part in parts:
        if isinstance(part, ImagePart):
            content.append({"type": "image", "source": {"type": "base64", "media_type": part.media_type, "data": part.data}})
        elif isinstance(part, TextPart):
            content.append({"type": "text", "text": part.text})
    return json.dumps({"type": "user", "message": {"role": "user", "content": content}}) + "\n"


def usage(result: dict[str, Any]) -> Usage:
    usage = result.get("usage") or {}
    return Usage(
        input_tokens=int(usage.get("input_tokens") or 0),
        output_tokens=int(usage.get("output_tokens") or 0),
        cache_read_tokens=int(usage.get("cache_read_input_tokens") or 0),
        cache_write_tokens=int(usage.get("cache_creation_input_tokens") or 0),
        reasoning_tokens=int((usage.get("output_tokens_details") or {}).get("thinking_tokens") or 0),
    )


async def run_claude_cli(
    model: str, system: str, parts: list, json_schema: dict[str, Any], effort: Optional[str], timeout_s: float
) -> tuple[dict[str, Any], int]:
    """Run one `claude -p` call. Returns the CLI's result event and the latency in ms."""
    args = [
        CLI, "-p", "--model", model, "--tools", "", "--system-prompt", system,
        "--json-schema", json.dumps(json_schema), "--input-format", "stream-json",
        "--output-format", "stream-json", "--verbose", "--no-session-persistence",
        "--setting-sources", "", "--strict-mcp-config",
    ]
    if effort:
        args += ["--effort", effort]
    env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "CLAUDECODE")}
    started = time.monotonic()
    # An empty working directory, so no project instructions are read into the call
    with tempfile.TemporaryDirectory(prefix="gr8r-claude-") as cwd:
        try:
            proc = await asyncio.create_subprocess_exec(
                *args, cwd=cwd, env=env, stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
        except OSError as e:
            raise LLMTransportError(f"claude CLI could not start: {e}") from e
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(_user_message(parts).encode()), timeout_s)
        except asyncio.TimeoutError as e:
            proc.kill()
            await proc.wait()
            raise LLMTransportError(f"claude CLI timed out after {timeout_s:.0f}s") from e
    latency_ms = int((time.monotonic() - started) * 1000)

    result = None
    for line in stdout.decode(errors="replace").splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if isinstance(event, dict) and event.get("type") == "result":
            result = event
    if result is None:
        raise LLMTransportError(f"claude CLI exited {proc.returncode} without a result: {stderr.decode(errors='replace')[-500:]}")
    if result.get("is_error") and result.get("structured_output") is None:
        raise LLMTransportError(f"claude CLI error ({result.get('subtype')}, {result.get('api_error_status')}): {str(result.get('result'))[:500]}")
    return result, latency_ms


def stop_reason(result: dict[str, Any]) -> tuple[StopReason, Optional[str]]:
    raw = result.get("stop_reason")
    return _STOP.get(raw, "other"), raw

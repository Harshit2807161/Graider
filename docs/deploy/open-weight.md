# Running Gr8r with self-hosted open-weight models

Gr8r's model router ([Proposal 002 §5](../proposals/002-grading-v2-architecture.md#5-model-layer)) treats two kinds of backend equally:

- **Open-weight models** you host yourself, served over the OpenAI-compatible API by **vLLM** or **SGLang** (provider `openweight`).
- **API models**: Claude (`anthropic`) and OpenAI (`openai`).

Each role (`VISION`, `RUBRIC_PARSER`, `GRADER`, `EVALUATOR`) has a primary model and an ordered list of fallbacks. Any role can use either kind, as primary or as fallback, and switching is configuration only.

## 1. Choose a profile

These profiles are in `backend/.env.example`:

| Profile | Vision (OCR) | Rubric parser | Grader | Evaluator | Data leaves your servers? |
|---|---|---|---|---|---|
| **A. API only** (default) | Claude Opus 5.5 | Claude Opus 5.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | Yes |
| **B. Hybrid** | Claude | Claude | **self-hosted** (e.g. Qwen3-32B), Claude fallback | Claude | Yes, for OCR, evaluation, and grader fallbacks |
| **C. Fully local** | **self-hosted VLM** (e.g. Qwen3-VL) | self-hosted | self-hosted | self-hosted, from a different model family than the grader | Only if you configure an API fallback and `LLM__ALLOW_EXTERNAL_FALLBACK=true` |
| **D. Local dev (Ollama)** | Claude | `qwen3:4b-instruct-2507-q4_K_M` | same | same | Yes, for OCR |

**Profile D (local development)** runs the text roles (rubric parser, grader, evaluator) on a laptop with **Ollama** and `qwen3:4b-instruct-2507-q4_K_M` (Qwen3-4B-Instruct-2507, 4-bit). OCR stays on Claude because that model is text-only. Grader and evaluator share one small model, so this profile is for development, not real grading:

```bash
brew install ollama && brew services start ollama
ollama pull qwen3:4b-instruct-2507-q4_K_M
# then uncomment "Profile D" in backend/.env.example (copied to backend/.env)
```

Which open model is good enough for each role is an empirical question. Run the eval harness (milestones M8/M9) before relying on one. Handwriting OCR is the hardest role: recent benchmarks rank the Qwen3-VL family best among open models, but call the problem "far from solved".

## 2. Serve a model with vLLM

**Requirements:** an NVIDIA GPU with enough memory for the model (or a quantized variant), plus the NVIDIA container toolkit.

```bash
# .env at the repo root
VLLM_IMAGE=vllm/vllm-openai:<pinned release tag>   # never :latest
VLLM_MODEL=Qwen/Qwen3-32B
VLLM_MODEL_REVISION=<Hugging Face commit sha>
HUGGING_FACE_HUB_TOKEN=hf_...                       # for gated models

docker compose -f docker-compose.yml -f docker-compose.openweight.yml up -d
```

Then point a role at it, for example the grader (profile B):

```env
LLM__GRADER__PROVIDER=openweight
LLM__GRADER__MODEL=Qwen/Qwen3-32B
LLM__GRADER__BASE_URL=http://vllm:8000/v1          # inside compose; http://localhost:8001/v1 from the host
LLM__GRADER__MODEL_REVISION=<same sha as VLLM_MODEL_REVISION>
LLM__GRADER__QUANTIZATION=<e.g. fp8, if used>
LLM__GRADER__FALLBACKS=[{"provider":"anthropic","model":"claude-sonnet-5-5","effort":"medium"}]
```

SGLang works the same way, since it also exposes `/v1/chat/completions`. Point `BASE_URL` at it.

## 3. Production rules for self-hosted models

- **Pin everything.** Pin the server image tag, the Hugging Face model **revision**, and the quantization. Put the same revision and quantization in `LLM__<ROLE>__MODEL_REVISION` / `__QUANTIZATION`. They are recorded on every call for audit and fairness, so you can always tell exactly which weights graded an answer.
- **Structured output.** The router sends a strict `json_schema` `response_format`, and vLLM/SGLang enforce it with guided decoding (xgrammar by default in recent vLLM). For a server or model that can't do this, set `LLM__<ROLE>__SUPPORTS_JSON_SCHEMA=false`. The router then puts the schema in the prompt and validates the output; these calls are marked *degraded* in the audit record.
- **Vision.** Only vision-language models can serve the `VISION` role. Set `SUPPORTS_VISION=false` on text-only targets: config validation rejects them for `VISION`, and the router skips them for requests that contain images.
- **Thinking models.** If a reasoning model mixes thinking text with JSON under guided decoding, disable its thinking mode or use its non-thinking variant for structured roles.
- **Health.** vLLM exposes `/health`, which the compose service uses as its healthcheck. Scale with more replicas behind a load balancer. vLLM's production stack supports autoscaling on queue depth.
- **Ollama** is fine on a laptop (`LLM__GRADER__BASE_URL=http://localhost:11434/v1`), but not for concurrent production load.

## 4. Fallback, egress and fairness

- **Fallback triggers:** the router moves to the next target on a connection error or timeout, a refusal, output still truncated after one retry with more tokens, or output still invalid after one repair request.
- **Egress:** `LLM__ALLOW_EXTERNAL_FALLBACK=false` keeps a self-hosted primary from ever falling back to an external API. Student data then never leaves your servers, and failures go to a human or fail the run instead.
- **Fairness:** answers graded by a fallback model are accepted, and the model that answered is recorded. A grader's fallback never uses the evaluator's model, so the evaluator's "fresh eyes" stay independent.
- **Cost:** self-hosted calls count as $0 in the per-submission USD budget, unless you set a price, e.g. `LLM__PRICES={"Qwen/Qwen3-32B":{"input":0.1,"output":0.3}}`. They still count toward the call budget.

## 5. Check that it works

```bash
cd backend
LIVE_OPENWEIGHT_BASE_URL=http://localhost:8001/v1 LIVE_OPENWEIGHT_MODEL=Qwen/Qwen3-32B pytest -m live -k open_weight
```

This makes one structured-output call through the real router and invoker.

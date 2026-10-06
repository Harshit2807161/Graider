# Observability (Langfuse)

Engineers use [Langfuse](https://langfuse.com) to:
- see what the grading agents did, run by run;
- watch cumulative latency, cost and token use;
- get alerts when those regress.

It is **optional** and **not the audit record**. The audit record is the `grading_runs` and `llm_calls` tables, written in the same flow as the grades ([audit-trail.md](audit-trail.md)). If Langfuse is down, grading continues and the audit trail is complete.

## Why Langfuse

The requirement was an external service with:
- reliable tracing;
- an agent-aware view of LangGraph runs;
- dashboards for cumulative latency, cost and tokens by model and role;
- alerts;
- self-hosting or EU hosting, because student text is personal data.

We compared nine tools in October 2026. The research sources are in ADR-015.

| | MLflow 3.16 (OSS, first choice) | **Langfuse** (MIT core) | Opik (Apache-2.0) | LangSmith | Phoenix (ELv2) |
|---|---|---|---|---|---|
| LangGraph trace view | Span tree + derived graph | Tree, timeline, agent graph, sessions | Tree, graph, threads | Run tree; graph only in Studio | Tree; graph in paid AX |
| Dashboards grouped by our own fields | Fixed overview; groups by model only | **Custom dashboards** by name, model, tag, metadata | By model, tag, metadata | Custom dashboards US-only | Paid AX only |
| p95 latency | No (p50/p90/p99) | Yes | No (P90) | No | Paid |
| Alerts | None | **Monitors** (Slack, webhook) | Yes | Yes | Paid |
| Cost for self-hosted models | $0 or missing | Custom model prices | Manual | Price map | Yes |
| Self-host | Light (Postgres) | Heavy (Postgres, ClickHouse, Redis, S3) | Heavier; no login | Enterprise only | Light |

**Langfuse is the only free edition that covers every requirement.** Its cost is a heavier self-hosted stack. Helicone (maintenance mode), Laminar (no alerts), W&B Weave and Braintrust (proprietary) and Datadog (hosted only) were ruled out.

## Running it

**Self-hosted.** This is the default, and student text stays on our infrastructure.

```bash
docker compose -f docker-compose.yml -f docker-compose.langfuse.yml up -d
```

- **UI:** http://localhost:3001. Sign in as `admin@gr8r.local` with password `gr8r-dev-password`.
- **Setup:** it creates the org, the project and API keys automatically, and points the worker at it. Nothing else to configure.
- **Resources:** needs about 4 CPU cores and 16 GB RAM (ClickHouse).
- **Production:** replace every dev secret listed in `.env.example`. The compose file has no high availability; use Langfuse's Kubernetes/Helm deployment with managed Postgres, ClickHouse and S3 instead.
- **Telemetry:** Langfuse's own telemetry is turned off.

**Langfuse Cloud (EU region).** Set these in `.env`, and sign a data processing agreement first:

```bash
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

**How tracing is switched on.** It's on only when all three settings are set. The base URL must be explicit, so traces never go to a hosted service by accident.

**Other SDK settings.** These are read from the environment, e.g.:
- `LANGFUSE_SAMPLE_RATE`
- `LANGFUSE_TRACING_ENVIRONMENT`
- `LANGFUSE_TIMEOUT`

## What a grading run looks like

- **One trace per grading run.**
  - Its id is derived from the run id (`trace_id_for(run_id)`) and stored on `grading_runs.trace_id`.
  - Root observation `grading_run`, of type agent, carrying `grading_run_id` and `submission_id`.
  - Session = submission: an upload and its regrades sit together.
  - Tag = trigger (`upload`, `regrade`).
  - Release = `CODE_VERSION`.
- **Everything nests under it.** That covers the LangGraph nodes (tagging, subject graders, evaluation, retries) and every model call. No call site has tracing code: a LangChain configure hook attaches the Langfuse handler for the duration of the run.
- **Model calls are named `role.purpose`**, e.g. `vision.ocr_answers`, `grader.grade`, `evaluator.evaluate`, `grader.grade_revision`. They also carry metadata: `role`, `purpose`, `question`, `round`, `attempt_kind` (initial, repair, truncation_retry, fallback), `model_requested` and `fallback_reason`. Each call records the model that answered, its tokens and its latency.
- **Cost:** Langfuse computes it from its price table.
  - **Claude:** its Opus/Sonnet 5.5 prices are identical to ours (`app/llm/costs.py`).
  - **Self-hosted models:** add a model definition in Langfuse (*Settings → Models*) to give them a price, or they show no cost.

**Verified end to end (Oct 2026):** a submission graded on local Ollama models with self-hosted Langfuse 4.50 showed:
- one trace with the run's id and metadata;
- every one of the 13 model calls as a generation, matching the 13 `llm_calls` rows;
- the metrics API grouping p95 latency, tokens and cost by `role.purpose`;
- no image data in the trace.

## Dashboards and alerts

Build these in **Dashboards → New dashboard**. Filter on `type = GENERATION` and use these widgets:

| Widget | Measure | Group by |
|---|---|---|
| Cost over time by model | total cost (sum), time series | model |
| Cost by role/purpose | total cost (sum) | name (`grader.grade`, …) |
| Latency p95 by role/purpose | latency (p95) | name |
| Tokens by model | total tokens (sum) | model |
| Fallbacks | count, filtered on metadata `attempt_kind = fallback` | model |
| Errors | count, filtered on level `ERROR` | name |
| Cost per grading run | total cost (sum), traces view | trace name |

The same queries are available programmatically from the [Metrics API](https://langfuse.com/docs/metrics/features/metrics-api) (`GET /api/public/v2/metrics`).

**Alerts.** Langfuse monitors are included in self-hosted v4 with no limit. Use them for spikes in cost per trace and regressions in p95 latency, sent to Slack or a webhook.

## Privacy

Student data rules:
- **Images never leave the process.** Media upload is off (`LANGFUSE_MEDIA_UPLOAD_ENABLED=false`), and a mask replaces inline base64 payloads, including inside LangChain message objects. `tests/test_tracing.py` guards this.
- **Text does go to Langfuse.** That means transcribed answers, rubrics and feedback, which are personal data. So Langfuse must be self-hosted, or the EU cloud under a data processing agreement.
- **Retention:** automatic data retention is an Enterprise feature when self-hosted. Until we add a scheduled deletion job via the API (backlog), delete old traces manually.

## Reliability

What the client guarantees, and what it doesn't:
- **How spans are sent:** the SDK batches them in a background thread, retries, and flushes when the worker process shuts down.
- **What can be lost:**
  - spans can be dropped if the server stays unreachable;
  - a hard-killed worker loses the spans it hadn't sent yet.

That is why traces are observability, and the audit tables are the record.

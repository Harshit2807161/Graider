# Audit trail

Gr8r records what the AI did for every grade, so that any result can be explained, checked and defended. This page explains what is recorded, why, and how to read it.

## Why

Grades affect students, which brings legal obligations as well as engineering ones. **Legal interpretation is needed before relying on any of this.**

- **EU AI Act:**
  - AI "intended to be used to evaluate learning outcomes" is listed as **high-risk** in Annex III 3(b). The Commission's draft guidance (May 2026) says summative grading is typically high-risk.
  - High-risk obligations apply from **2 Dec 2027** (after the Digital Omnibus delay).
  - High-risk systems must log events automatically (Art. 12) and support human oversight, including overriding outputs (Art. 14).
  - Logs must be kept for **at least six months** (Arts. 19 and 26(6)).
  - Deployers must be told how to collect and interpret the logs (Art. 13(3)(f)). This page covers that.
  - Affected persons can ask for the AI's role and the main elements of a decision (Art. 86).
- **GDPR:** exam answers and examiners' comments are the candidate's personal data (CJEU *Nowak*, C-434/16). This affects retention, access requests and erasure.
- **FERPA (US):** if the school's records policy treats AI grading records as education records, students and parents can inspect them.

The design follows two principles from that research:
- **Audit is separate from observability.** The audit record is our own Postgres tables, written as decisions happen. Tracing tools (Langfuse, MLflow, LangSmith alike) deliver traces best-effort: batched, sampleable, deletable and dropped if the server stays unreachable. So traces are never the record.
- **Fail closed.** If an audit row can't be written, the run fails and no grade is stored.

## What is recorded

### `grading_runs`: one row per grading attempt of a submission

| Field | Meaning |
|---|---|
| `id` | Run id. It is also the Celery task's idempotency key, so a redelivered task for a finished run does nothing. |
| `submission_id`, `trigger`, `created_by_membership_id` | What was graded, why (`upload` / `regrade`), and who started it |
| `status` | `queued → running → succeeded / failed`. Status only moves forward; a failed run keeps its `error`. |
| `config_snapshot`, `config_hash` | The models, fallbacks, budgets and egress setting **the worker actually used**, captured when the run starts |
| `code_version` | Deployed code version (git SHA via `CODE_VERSION`). Prompts live in code, so this pins them. |
| `llm_calls`, `cost_usd` | Totals over the run's calls |
| `trace_id` | Soft link to the run's Langfuse trace, if tracing was on and the trace was kept |

### `llm_calls`: one row per model call attempt, including failures

| Field | Meaning |
|---|---|
| `run_id`, `submission_id`, `question_label`, `role`, `purpose`, `round` | Where the call belongs |
| `attempt_no`, `attempt_kind` | `initial`, `repair` (invalid output, one retry), `truncation_retry`, `fallback` |
| `provider`, `model_requested`, `model_answered`, `base_url`, `external`, `model_revision`, `quantization` | Which model actually answered, whether data left our servers, and exactly which open-weight build |
| `request` | Rendered system prompt, messages, parameters and output schema. **Images are stored as reference + SHA-256, never as bytes.** |
| `response_raw`, `parsed`, `stop_reason`, `refusal_detail` | What came back, and why it stopped |
| `response_id`, `request_id` | Provider ids for support and incident tracing |
| tokens, `cost_usd`, `latency_ms` | Usage and cost |
| `schema_name`, `schema_hash`, `degraded` | The output contract, and whether it was enforced only by prompt |
| `error_type`, `error_message`, `fallback_reason` | Why an attempt failed and why the router moved on |

**Append-only:** on Postgres, triggers reject `UPDATE`, `DELETE` and `TRUNCATE` on `llm_calls` (TRUNCATE needs its own statement-level trigger).

**Coming later:**
- Versioned transcriptions and grades that point to the exact calls that produced them (M5).
- Append-only human actions: overrides with a mandatory reason, approvals, publishing (M6).

## How to read it

```sql
-- Every attempt behind one submission, in order
SELECT r.id AS run, r.trigger, r.status, c.purpose, c.question_label, c.attempt_kind,
       c.model_answered, c.stop_reason, c.error_type, c.cost_usd, c.created_at
FROM grading_runs r JOIN llm_calls c ON c.run_id = r.id
WHERE r.submission_id = '<submission id>'
ORDER BY r.created_at, c.created_at;
```

The matching Langfuse trace, if tracing is on, has id `grading_runs.trace_id` (derived from the run id) and carries the run and submission ids as metadata.

## Observability (optional)

Engineers use **Langfuse** for traces, cost and latency dashboards, and alerts. It's separate from the audit record and never required for grading. Setup, what's traced and the privacy notes are in [observability.md](observability.md).

## Deliberately not done yet

These are recognised practices, deferred until there is a policy decision behind them. Details are in [v2 backlog](v2-backlog.md).

- **Tamper evidence beyond triggers:**
  - a hash chain per run, with daily anchors in write-once (WORM) storage;
  - a database role limited to `INSERT`/`SELECT`.
- **Retention:**
  - retention tiers and purge jobs, with legal holds;
  - raw payloads kept for max(6 months, appeal window), with decision records kept longer.
- **Erasure:** a separate encrypted payload store per student, so a payload can be erased while its hashes remain ("crypto-shredding"). Whether this satisfies GDPR Art. 17 is legally unsettled.
- **Data subject access:** per-student export (GDPR access requests, FERPA inspection), and logging reads of audit data.
- **Provider ids and retries:**
  - Anthropic's `request-id` header, which LangChain doesn't expose;
  - the SDK's internal retries, which are hidden today;
  - a "started" row written before each call.

## Sources

- EU AI Act: [Annex III](https://artificialintelligenceact.eu/annex/3/), [Art. 12](https://artificialintelligenceact.eu/article/12/), [Art. 13](https://artificialintelligenceact.eu/article/13/), [Art. 14](https://artificialintelligenceact.eu/article/14/), [Art. 19](https://artificialintelligenceact.eu/article/19/), [Art. 26](https://artificialintelligenceact.eu/article/26/), [Art. 86](https://artificialintelligenceact.eu/article/86/)
- CJEU *Nowak* C-434/16: [press release](https://curia.europa.eu/site/upload/docs/application/pdf/2017-12/cp170140en.pdf)
- FERPA: [34 CFR 99.10](https://www.law.cornell.edu/cfr/text/34/99.10), [99.32](https://www.law.cornell.edu/cfr/text/34/99.32)
- NIST AI 600-1 (GenAI profile): [PDF](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- Microsoft, fail-closed logging for compliance: [Azure OpenAI gateway monitoring](https://learn.microsoft.com/azure/architecture/ai-ml/guide/azure-openai-gateway-monitoring)
- AWS Bedrock invocation logging (large payloads by reference): [docs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- PostgreSQL triggers (TRUNCATE needs a statement-level trigger): [CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- Trace delivery is best-effort: [MLflow production tracing](https://mlflow.org/docs/latest/genai/tracing/prod-tracing/), [Langfuse queuing and batching](https://langfuse.com/docs/observability/features/queuing-batching)

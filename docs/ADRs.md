# Gr8r - Architecture Decision Records (ADRs)

## Overview
This document contains all Architecture Decision Records (ADRs) for the Gr8r grading system. ADRs document significant architectural decisions made during the design and development of the system.

---

## Table of Contents

1. [ADR-001: OCR Technology Selection](#adr-001-ocr-technology-selection)
2. [ADR-002: Agent Orchestration Framework](#adr-002-agent-orchestration-framework)
3. [ADR-003: Model Selection Strategy](#adr-003-model-selection-strategy)
4. [ADR-004: Frontend Technology](#adr-004-frontend-technology)
5. [ADR-005: Backend Framework](#adr-005-backend-framework)
6. [ADR-006: Storage Strategy (MVP)](#adr-006-storage-strategy-mvp)
7. [ADR-007: Rubric Input Format](#adr-007-rubric-input-format)
8. [ADR-008: Two-Step Processing Pipeline](#adr-008-two-step-processing-pipeline)
9. [ADR-009: Agent Feedback Loop](#adr-009-agent-feedback-loop)
10. [ADR-010: Error Handling Strategy](#adr-010-error-handling-strategy)

---

## ADR-001: OCR Technology Selection

### Status
**Accepted** (January 2026)

### Context
We need to extract handwritten text from student answer sheets for automated grading. The original plan specified EyePop.ai as the OCR solution based on initial research.

### Decision
Use **Claude Vision API** for OCR extraction instead of EyePop.ai.

### Research Findings

| Aspect | EyePop.ai | Claude Vision |
|--------|-----------|---------------|
| Handwriting OCR | Basic (not specialized) | Excellent |
| LLM Integration | None native | Native (same API) |
| Custom Training | Object detection only | Not needed |
| Pricing | $20/month flat | Per-image |
| JSON Output | Yes | Yes (structured) |

### Alternatives Considered

1. **EyePop.ai** (Original plan)
   - Pros: Low cost, object detection features
   - Cons: Not optimized for handwriting, no LLM integration

2. **Mistral OCR 3**
   - Pros: 88.9% handwriting accuracy, $1/1000 pages
   - Cons: Separate API, additional integration

3. **Google Document AI**
   - Pros: Enterprise-grade, multilingual
   - Cons: Separate infrastructure, higher complexity

4. **Azure Document Intelligence**
   - Pros: Custom model training
   - Cons: Higher cost, Microsoft ecosystem lock-in

### Rationale
- Research showed EyePop.ai is primarily for object detection, not handwriting OCR
- Claude Vision provides excellent handwriting recognition in one API
- Simplifies architecture (single provider for OCR and grading)
- Two-step approach maintains separation of concerns
- Native JSON output support

### Consequences

**Positive:**
- High-quality handwriting extraction
- Single API provider simplifies maintenance
- Consistent API for both OCR and grading
- Native structured output support

**Negative:**
- Higher per-image cost than dedicated OCR services
- Rate limits apply to Claude API
- Dependent on single provider

### Implementation Notes
```python
# Example OCR call
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "data": image_data}},
            {"type": "text", "text": "Extract all text from this handwritten answer..."}
        ]
    }]
)
```

---

## ADR-002: Agent Orchestration Framework

### Status
**Accepted** (January 2026)

### Context
We need multi-agent orchestration to route questions to specialized graders and implement evaluation feedback loops. The system requires:
- Supervisor-worker pattern
- Inter-agent communication
- State management across agents
- Observability for debugging

### Decision
Use **LangGraph + Full AGNTCY Stack** for agent orchestration.

Components:
- **LangGraph**: Workflow orchestration and state management
- **AGNTCY App SDK**: Agent communication factory
- **SLIM**: Secure messaging transport
- **Observe SDK**: Tracing and debugging

### Alternatives Considered

1. **LangGraph Only** (Simpler)
   - Pros: Faster setup, less complexity
   - Cons: No built-in observability, limited scalability

2. **AutoGen**
   - Pros: Microsoft backing, easy multi-agent
   - Cons: Less control over routing, different paradigm

3. **CrewAI**
   - Pros: Simple agent definition
   - Cons: Less mature, limited enterprise features

4. **Custom Implementation**
   - Pros: Full control
   - Cons: Significant development effort

### Rationale
- LangGraph provides native supervisor-worker pattern
- AGNTCY adds production-ready infrastructure:
  - SLIM for secure, encrypted messaging
  - A2A protocol for standardized agent communication
  - Observe SDK for OpenTelemetry-compliant tracing
  - OASF for agent discovery and registration
- Linux Foundation backing ensures long-term viability
- Growing ecosystem with 75+ contributing companies

### Consequences

**Positive:**
- Production-ready infrastructure from day one
- Built-in observability for debugging
- Scalable to distributed deployment
- Standard protocols for future extensibility

**Negative:**
- More complex initial setup
- Learning curve for AGNTCY stack
- Additional dependencies

### Implementation Notes
```python
from langgraph.graph import StateGraph
from agntcy_app_sdk.factory import AgntcyFactory
from ioa_observe.sdk.decorators import agent, graph

@graph(name="grading_workflow")
def create_grading_graph():
    graph = StateGraph(GradingState)
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("math_grader", math_grader_node)
    # ...
    return graph.compile()
```

---

## ADR-003: Model Selection Strategy

### Status
**Accepted** (January 2026)

### Context
We need to select appropriate Claude models for different components of the system, balancing quality and cost.

### Decision
Use a tiered model strategy:
- **Orchestrator**: Claude Opus 4.5 (`claude-opus-4-5-20250929`)
- **Graders**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **OCR**: Claude Sonnet 4 (for cost efficiency)

### Cost Analysis

| Component | Model | Calls/Session | Est. Cost |
|-----------|-------|---------------|-----------|
| OCR (3 docs) | Sonnet 4 | 3 | ~$0.03 |
| Orchestrator | Opus 4.5 | 5-10 | ~$0.50 |
| Graders | Sonnet 4 | 3-5 | ~$0.05 |
| **Total** | | | **~$0.60/session** |

### Rationale
- Orchestrator makes critical routing and evaluation decisions requiring highest quality
- Graders process more requests; Sonnet provides excellent quality at lower cost
- Can optimize further in V1 based on telemetry data
- Sonnet 4 sufficient for OCR tasks

### Consequences

**Positive:**
- Optimal quality for critical decisions
- Cost-effective for high-volume grading tasks
- Flexibility to adjust based on performance data

**Negative:**
- Higher orchestrator costs compared to all-Sonnet approach
- Multiple model versions to maintain

---

## ADR-004: Frontend Technology

### Status
**Accepted** (January 2026)

### Context
We need a responsive web interface for file uploads, processing status, and results display.

### Decision
Use **React with Vite** as a separate SPA, connecting to FastAPI backend.

Tech stack:
- React 18+
- Vite (build tool)
- TypeScript
- Tailwind CSS
- Axios (HTTP client)

### Alternatives Considered

1. **Next.js Full-Stack**
   - Pros: SSR, API routes, all-in-one
   - Cons: Overkill for MVP, ties frontend to Node.js

2. **Svelte/SvelteKit**
   - Pros: Smaller bundle, less boilerplate
   - Cons: Smaller ecosystem, team unfamiliarity

3. **Vue.js**
   - Pros: Gentle learning curve
   - Cons: Smaller job market, less React experience

4. **HTMX + FastAPI Templates**
   - Pros: Simpler, no JS framework
   - Cons: Limited interactivity, harder progress updates

### Rationale
- React has the largest ecosystem and component libraries
- Vite provides fast development experience (HMR, ESBuild)
- TypeScript ensures type safety
- Separation from backend enables independent deployment
- Team has React experience

### Consequences

**Positive:**
- Rich ecosystem for file upload, progress components
- Fast development with Vite HMR
- Type safety with TypeScript
- Clear separation of concerns

**Negative:**
- Two separate deployments for MVP
- CORS configuration required
- Slightly more complex than server-rendered HTML

---

## ADR-005: Backend Framework

### Status
**Accepted** (January 2026)

### Context
We need a Python backend framework that supports async operations, integrates well with ML/AI libraries, and provides good developer experience.

### Decision
Use **FastAPI** as the backend framework.

### Alternatives Considered

1. **Flask** (Existing code uses this)
   - Pros: Simple, familiar, existing code
   - Cons: No native async, manual validation

2. **Django**
   - Pros: Full-featured, admin panel
   - Cons: Heavy for API-only, ORM overhead

3. **Starlette**
   - Pros: Lightweight async
   - Cons: No automatic validation, less features

4. **FastAPI** (Chosen)
   - Pros: Async native, Pydantic validation, auto docs
   - Cons: Newer, less tutorials than Flask

### Rationale
- Native async/await for LLM API calls
- Automatic request validation with Pydantic
- Auto-generated OpenAPI documentation
- Excellent integration with Python AI ecosystem
- Modern Python 3.12 features support

### Consequences

**Positive:**
- Non-blocking I/O for concurrent LLM calls
- Type hints and validation out of the box
- Automatic API documentation
- Easy dependency injection

**Negative:**
- Migration from existing Flask code required
- Team needs FastAPI training

### Migration Note
Existing `DocumentParsing.py` (Flask) will be migrated to FastAPI service.

---

## ADR-006: Storage Strategy (MVP)

### Status
**Accepted** (January 2026)

### Context
MVP needs simple storage without external infrastructure dependencies.

### Decision
Use local storage strategy:
- **SQLite** for structured data (sessions, results)
- **JSON files** for intermediate outputs (OCR, triplets)
- **Local filesystem** for uploaded files

### Alternatives Considered

1. **PostgreSQL**
   - Pros: Production-ready, full SQL
   - Cons: External dependency, setup overhead

2. **Supabase**
   - Pros: Free tier, auth included
   - Cons: External dependency, learning curve

3. **MongoDB**
   - Pros: Document store fits JSON data
   - Cons: External dependency, different paradigm

4. **SQLite + JSON** (Chosen)
   - Pros: Zero setup, portable, debuggable
   - Cons: Not scalable, single-user

### Rationale
- Zero external dependencies for MVP
- Easy to inspect and debug (can view files directly)
- Sufficient for single-user MVP scale
- Can migrate to Supabase/PostgreSQL in V1

### Consequences

**Positive:**
- No setup required
- Easy debugging (inspect files)
- Fully portable
- Fast iteration

**Negative:**
- Not suitable for multi-user production
- Manual backup required
- No concurrent write safety

### Migration Path (V1)
```
MVP:    SQLite + JSON files
  ↓
V1:     Supabase (PostgreSQL + Storage)
  ↓
V2:     Managed PostgreSQL + S3
```

---

## ADR-007: Rubric Input Format

### Status
**Accepted** (January 2026)

### Context
Instructors need to provide grading rubrics. These may include:
- Text-based guidelines
- Sample answers as images
- Scoring criteria

### Decision
Support multiple rubric input formats:
- **Text files** (TXT, JSON)
- **Image files** (sample answers)
- **Combined** (text + images)

### Rationale
- Text rubrics are common and easy to parse
- Sample answer images provide visual reference
- Claude Vision can extract text from image rubrics
- Flexibility for different instructor preferences

### Consequences

**Positive:**
- Flexible input options
- Supports visual sample answers
- No format conversion required

**Negative:**
- More complex parsing logic
- Multiple code paths for different formats
- Larger storage requirements for images

### Implementation Notes
```python
class RubricProcessor:
    def process(self, files: List[UploadFile]) -> RubricData:
        text_content = []
        image_content = []

        for file in files:
            if file.content_type.startswith("image/"):
                # Process with Claude Vision
                image_content.append(self.ocr_image(file))
            else:
                # Parse text/JSON
                text_content.append(self.parse_text(file))

        return self.merge_rubric(text_content, image_content)
```

---

## ADR-008: Two-Step Processing Pipeline

### Status
**Accepted** (January 2026)

### Context
We need to decide between:
1. Single-step: Images go directly to grading agents
2. Two-step: OCR first, then text-based grading

### Decision
Use **two-step processing**:
1. **Step 1**: Claude Vision OCR → Structured JSON
2. **Step 2**: LangGraph agents grade extracted text

### Rationale
- Separation of concerns (OCR vs grading)
- Easier debugging (can inspect intermediate JSON)
- Reusable OCR output for re-grading
- Graders can focus on evaluation logic
- Lower cost (images processed once)

### Consequences

**Positive:**
- Clear separation of concerns
- Intermediate outputs for debugging
- Reusable OCR for multiple grading passes
- Specialized prompts for each step

**Negative:**
- Two API calls instead of one
- Potential loss of context from images
- Latency from sequential processing

### Pipeline Diagram
```
[Image] → [OCR Agent] → [questions.json] → [Triplet Builder]
                                                    ↓
[Image] → [OCR Agent] → [answers.json]  → [triplets.json]
                                                    ↓
[Text]  → [Parse]     → [rubric.json]   → [Grading Agents]
                                                    ↓
                                           [results.json]
```

---

## ADR-009: Agent Feedback Loop

### Status
**Accepted** (January 2026)

### Context
Grading quality may vary. We need a mechanism to ensure consistent, high-quality grades.

### Decision
Implement **orchestrator-based evaluation** with feedback loop:
1. Grader returns score + confidence
2. Orchestrator evaluates result
3. If confidence < threshold, request re-grade with feedback
4. Maximum 3 re-grade attempts

### Implementation
```python
def evaluate_grade(result: GradingResult) -> Action:
    if result.confidence >= 0.8:
        return Action.APPROVE
    elif result.attempts < 3:
        return Action.REGRADE_WITH_FEEDBACK
    else:
        return Action.APPROVE_WITH_FLAG
```

### Rationale
- Catches low-confidence grades
- Provides improvement feedback
- Limits infinite loops
- Maintains human-like quality check

### Consequences

**Positive:**
- Higher grading consistency
- Self-improving grades
- Audit trail of attempts

**Negative:**
- Increased latency for low-confidence cases
- Higher API costs for re-grades
- Complexity in state management

---

## ADR-010: Error Handling Strategy

### Status
**Accepted** (January 2026)

### Context
Multiple failure points exist:
- File upload failures
- OCR failures (blurry images)
- API rate limits
- Grading timeouts

### Decision
Implement **layered error handling**:

| Layer | Strategy | User Feedback |
|-------|----------|---------------|
| Upload | Immediate validation | "Invalid format" |
| OCR | Retry with backoff | "Retrying OCR..." |
| Grading | Timeout + partial results | "Some answers graded" |
| API | Exponential backoff | "Service busy, retrying" |

### Implementation
```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(RateLimitError)
)
async def call_claude_api(prompt: str) -> Response:
    return await client.messages.create(...)
```

### Rationale
- Graceful degradation
- User transparency
- Resilience to transient failures
- Clear recovery paths

### Consequences

**Positive:**
- Better user experience
- System resilience
- Clear error messages

**Negative:**
- Increased complexity
- Longer wait times for retries
- Partial results may confuse users

---

## ADR Template

For future decisions, use this template:

```markdown
## ADR-XXX: [Title]

### Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

### Context
[Describe the issue and why a decision is needed]

### Decision
[State the decision clearly]

### Alternatives Considered
[List alternatives with pros/cons]

### Rationale
[Explain why this decision was made]

### Consequences
[List positive and negative consequences]

### Implementation Notes
[Optional: code examples or implementation details]
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Gr8r Team | Initial ADRs for MVP |

# Gr8r MVP Implementation Plan

## Executive Summary

**Gr8r** is an AI-powered grading system that evaluates handwritten subjective answers using multi-agent orchestration. This plan covers the MVP implementation with Claude Vision OCR, LangGraph + AGNTCY orchestration, and a React + FastAPI web stack.

---

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| OCR | Claude Vision API | Best handwriting recognition, simplifies architecture |
| Orchestrator Model | Claude Opus 4.5 | Highest quality for routing and evaluation decisions |
| Grader Models | Claude Sonnet 4 | Best quality/cost balance for grading tasks |
| Frontend | React (Vite) | Fast development, rich ecosystem |
| Backend | FastAPI (Python) | Async support, great for ML/AI integration |
| Orchestration | LangGraph + AGNTCY | Full agent infrastructure with observability |
| Storage | SQLite + JSON files | Simple, no external dependencies for MVP |
| Environment | Conda | Reproducible Python environments |

---

## 1. User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INSTRUCTOR FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Upload  │───▶│ Upload Answer│───▶│ Upload Rubric│───▶│   Submit     │  │
│  │  Q Paper │    │   Sheets     │    │ (txt/img)    │    │   for Grade  │  │
│  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│       │                │                    │                    │          │
│       ▼                ▼                    ▼                    ▼          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Preview │    │   Preview    │    │   Preview    │    │  Processing  │  │
│  │  Images  │    │   Thumbnails │    │   Content    │    │   Status     │  │
│  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                    │        │
│                                                                    ▼        │
│                                                          ┌──────────────┐  │
│                                                          │   View       │  │
│                                                          │   Results    │  │
│                                                          │   Dashboard  │  │
│                                                          └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           MVP SIMPLIFIED FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐  │
│   │   Upload   │────▶│   Upload   │────▶│   Upload   │────▶│   Grade    │  │
│   │  Question  │     │   Answer   │     │   Rubric   │     │   Button   │  │
│   │   Paper    │     │   Sheets   │     │            │     │            │  │
│   └────────────┘     └────────────┘     └────────────┘     └────────────┘  │
│                                                                    │        │
│                           ┌────────────────────────────────────────┘        │
│                           ▼                                                  │
│                    ┌─────────────┐                                          │
│                    │  Processing │                                          │
│                    │   Spinner   │                                          │
│                    └─────────────┘                                          │
│                           │                                                  │
│                           ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      RESULTS DASHBOARD                               │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │  Q1: [Score: 8/10] [Feedback: Good explanation of...]               │  │
│   │  Q2: [Score: 5/10] [Feedback: Missing key concept...]               │  │
│   │  Q3: [Score: 10/10] [Feedback: Excellent answer...]                 │  │
│   │  ────────────────────────────────────────────────                   │  │
│   │  TOTAL: 23/30 (76.7%)                                               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND LAYER                                    │
│                                   (React + Vite)                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │   Upload     │  │  Processing  │  │   Results    │  │      API Client          ││
│  │  Components  │  │    Status    │  │  Dashboard   │  │   (Axios/Fetch)          ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTP/REST
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND LAYER                                     │
│                                     (FastAPI)                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │   /upload    │  │   /grade     │  │  /results    │  │     /status              ││
│  │   endpoint   │  │   endpoint   │  │   endpoint   │  │     endpoint             ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│         │                 │                 │                     │                 │
│         ▼                 ▼                 ▼                     ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                         SERVICE LAYER                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │   Upload    │  │    OCR      │  │   Grading   │  │     Storage         │  │  │
│  │  │   Service   │  │   Service   │  │   Service   │  │     Service         │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                OCR PROCESSING LAYER                                  │
│                              (Claude Vision API)                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌────────────────┐         ┌────────────────┐         ┌────────────────┐         │
│   │  Question      │         │  Answer Sheet  │         │    Rubric      │         │
│   │  Paper OCR     │         │     OCR        │         │   Processing   │         │
│   │  (Claude)      │         │   (Claude)     │         │   (Claude)     │         │
│   └───────┬────────┘         └───────┬────────┘         └───────┬────────┘         │
│           │                          │                          │                   │
│           ▼                          ▼                          ▼                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                      STRUCTURED JSON OUTPUT                                 │   │
│   │  {questions: [...], answers: [...], rubric: {...}}                         │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                          │
└──────────────────────────────────────────┼──────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TRIPLET FORMATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                         JOIN FUNCTION                                       │   │
│   │  Input: questions_json + answers_json + rubric_json                        │   │
│   │  Output: [{question, candidate_answer, expected_answer, max_score}, ...]   │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                          │
└──────────────────────────────────────────┼──────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         AGENT ORCHESTRATION LAYER                                    │
│                         (LangGraph + AGNTCY Stack)                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                    ORCHESTRATOR AGENT (Claude Opus 4.5)                     │   │
│   │  • Analyzes triplets                                                        │   │
│   │  • Assigns subject tags (math/english/science)                             │   │
│   │  • Assigns question type tags (MCQ/reasoning/elucidate)                    │   │
│   │  • Routes to appropriate grader                                             │   │
│   │  • Evaluates grading results                                                │   │
│   │  • Provides feedback loop if needed                                         │   │
│   └─────────────────────────────────┬───────────────────────────────────────────┘   │
│                                     │                                               │
│              ┌──────────────────────┼──────────────────────┐                       │
│              ▼                      ▼                      ▼                       │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐              │
│   │   MATH GRADER    │   │  ENGLISH GRADER  │   │  SCIENCE GRADER  │              │
│   │ (Claude Sonnet 4)│   │ (Claude Sonnet 4)│   │ (Claude Sonnet 4)│              │
│   │                  │   │                  │   │                  │              │
│   │ • Math rubric    │   │ • Grammar check  │   │ • Concept check  │              │
│   │ • Calc accuracy  │   │ • Content eval   │   │ • Accuracy eval  │              │
│   │ • Method eval    │   │ • Structure      │   │ • Reasoning      │              │
│   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘              │
│            │                      │                      │                         │
│            └──────────────────────┼──────────────────────┘                         │
│                                   ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                         EVALUATOR (in Orchestrator)                         │   │
│   │  • Validates grading consistency                                            │   │
│   │  • Triggers re-grade if confidence < threshold                             │   │
│   │  • Aggregates final scores                                                  │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                      AGNTCY INFRASTRUCTURE                                  │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│   │  │    SLIM     │  │     A2A     │  │   Observe   │  │    OASF     │       │   │
│   │  │  Transport  │  │  Protocol   │  │     SDK     │  │   Schema    │       │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                          │
└──────────────────────────────────────────┼──────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STORAGE LAYER (MVP)                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────┐│
│   │      SQLite DB      │  │   JSON Files        │  │   File Storage              ││
│   │  • Sessions         │  │   • OCR outputs     │  │   • Uploaded images         ││
│   │  • Results          │  │   • Triplets        │  │   • Rubric files            ││
│   │  • Metadata         │  │   • Grading logs    │  │   • Temp processing         ││
│   └─────────────────────┘  └─────────────────────┘  └─────────────────────────────┘│
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              END-TO-END DATA FLOW                                   │
└────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: INPUT INGESTION
━━━━━━━━━━━━━━━━━━━━━━━
     [Question Paper]        [Answer Sheets]         [Rubric]
      (Images/PDF)           (Images/PDF)          (Text/Image)
           │                      │                     │
           ▼                      ▼                     ▼
     ┌──────────┐           ┌──────────┐          ┌──────────┐
     │  Upload  │           │  Upload  │          │  Upload  │
     │  & Save  │           │  & Save  │          │  & Save  │
     └────┬─────┘           └────┬─────┘          └────┬─────┘
          │                      │                     │
          ▼                      ▼                     ▼
     /data/uploads/         /data/uploads/        /data/uploads/
     session_123/           session_123/          session_123/
     questions/             answers/              rubric/


STEP 2: OCR PROCESSING (Claude Vision)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ┌─────────────────────────────────────────────────────────────┐
     │                   Claude Vision API                          │
     │  Prompt: "Extract all questions with their numbers and       │
     │           full text. Return as structured JSON."             │
     └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
     ┌─────────────────────────────────────────────────────────────┐
     │  questions.json                                              │
     │  {                                                           │
     │    "questions": [                                            │
     │      {"id": "Q1", "text": "Explain photosynthesis...",      │
     │       "max_score": 10, "type": "descriptive"},              │
     │      {"id": "Q2", "text": "Solve: 2x + 5 = 15",             │
     │       "max_score": 5, "type": "problem"}                    │
     │    ]                                                         │
     │  }                                                           │
     └─────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │  answers.json                                                │
     │  {                                                           │
     │    "answers": [                                              │
     │      {"question_id": "Q1",                                  │
     │       "text": "Photosynthesis is the process by which..."}  │
     │      {"question_id": "Q2",                                  │
     │       "text": "2x + 5 = 15, 2x = 10, x = 5"}                │
     │    ]                                                         │
     │  }                                                           │
     └─────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │  rubric.json                                                 │
     │  {                                                           │
     │    "grading_criteria": {                                     │
     │      "Q1": {                                                 │
     │        "expected_points": ["light absorption", "chlorophyll",│
     │                            "glucose production", "oxygen"],  │
     │        "sample_answer": "...",                               │
     │        "scoring": {"full": 10, "partial": 5, "minimal": 2}  │
     │      }                                                       │
     │    }                                                         │
     │  }                                                           │
     └─────────────────────────────────────────────────────────────┘


STEP 3: TRIPLET FORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━
     ┌─────────────────────────────────────────────────────────────┐
     │  triplet_builder.py                                          │
     │                                                              │
     │  def build_triplets(questions, answers, rubric):            │
     │      triplets = []                                          │
     │      for q in questions:                                    │
     │          triplets.append({                                  │
     │              "question_id": q.id,                           │
     │              "question_text": q.text,                       │
     │              "candidate_answer": answers[q.id],             │
     │              "expected_answer": rubric[q.id],               │
     │              "max_score": q.max_score                       │
     │          })                                                 │
     │      return triplets                                        │
     └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
     ┌─────────────────────────────────────────────────────────────┐
     │  triplets.json                                               │
     │  [                                                           │
     │    {                                                         │
     │      "question_id": "Q1",                                   │
     │      "question_text": "Explain photosynthesis...",          │
     │      "candidate_answer": "Photosynthesis is the process...",│
     │      "expected_answer": {...rubric details...},             │
     │      "max_score": 10                                        │
     │    },                                                        │
     │    ...                                                       │
     │  ]                                                           │
     └─────────────────────────────────────────────────────────────┘


STEP 4: ORCHESTRATION & GRADING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ┌─────────────────────────────────────────────────────────────┐
     │              ORCHESTRATOR (Claude Opus 4.5)                  │
     │                                                              │
     │  For each triplet:                                          │
     │    1. Analyze question → Assign tags                        │
     │       Tags: {subject: "science", type: "descriptive"}       │
     │                                                              │
     │    2. Route to appropriate grader                           │
     │       → science_grader(triplet)                             │
     │                                                              │
     │    3. Receive grading result                                │
     │       {score: 8, confidence: 0.85, feedback: "..."}         │
     │                                                              │
     │    4. Evaluate result                                       │
     │       if confidence < 0.7: request_regrade()                │
     │       else: approve_grade()                                 │
     └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
     ┌─────────────────────────────────────────────────────────────┐
     │  grading_results.json                                        │
     │  [                                                           │
     │    {                                                         │
     │      "question_id": "Q1",                                   │
     │      "score": 8,                                            │
     │      "max_score": 10,                                       │
     │      "reasoning": "Student correctly identified the main...",│
     │      "feedback": "Good understanding. To improve, include...",│
     │      "grader": "science_grader",                            │
     │      "confidence": 0.92                                     │
     │    },                                                        │
     │    ...                                                       │
     │  ]                                                           │
     └─────────────────────────────────────────────────────────────┘


STEP 5: OUTPUT TO FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━
     ┌─────────────────────────────────────────────────────────────┐
     │                    RESULTS DASHBOARD                         │
     │  ┌─────────────────────────────────────────────────────────┐│
     │  │ Student: John Doe    │    Total: 23/30 (76.7%)          ││
     │  ├─────────────────────────────────────────────────────────┤│
     │  │ Q1 (Science) ████████░░ 8/10                            ││
     │  │ ▸ Reasoning: Student correctly identified the main...   ││
     │  │ ▸ Feedback: Good understanding. To improve...           ││
     │  ├─────────────────────────────────────────────────────────┤│
     │  │ Q2 (Math)    ██████████ 5/5                             ││
     │  │ ▸ Reasoning: Correct solution with proper steps.        ││
     │  │ ▸ Feedback: Excellent work! All steps shown clearly.    ││
     │  ├─────────────────────────────────────────────────────────┤│
     │  │ Q3 (English) ██████████ 10/15                           ││
     │  │ ▸ Reasoning: Good argument structure but...             ││
     │  │ ▸ Feedback: Consider adding more supporting evidence... ││
     │  └─────────────────────────────────────────────────────────┘│
     └─────────────────────────────────────────────────────────────┘
```

---

## 4. Architecture Decision Records (ADRs)

### ADR-001: OCR Technology Selection

**Status**: Accepted

**Context**:
Need to extract handwritten text from student answer sheets. Original plan was EyePop.ai, but research showed it's not optimized for handwriting OCR.

**Decision**:
Use **Claude Vision API** for OCR extraction.

**Rationale**:
- Research showed EyePop.ai is primarily for object detection, not handwriting OCR
- Claude Vision provides excellent handwriting recognition
- Simplifies architecture (same API for OCR and grading)
- Two-step approach maintains separation of concerns

**Consequences**:
- (+) High-quality handwriting extraction
- (+) Single API provider for simplicity
- (+) Native JSON output support
- (-) Higher per-image cost than dedicated OCR
- (-) Rate limits apply

---

### ADR-002: Agent Orchestration Framework

**Status**: Accepted

**Context**:
Need multi-agent orchestration for routing questions to specialized graders with evaluation feedback loops.

**Decision**:
Use **LangGraph + Full AGNTCY Stack** (App SDK, SLIM, Observe SDK).

**Rationale**:
- LangGraph provides supervisor-worker pattern natively
- AGNTCY adds production-ready infrastructure:
  - SLIM for secure agent messaging
  - A2A protocol for inter-agent communication
  - Observe SDK for debugging and tracing
  - OASF for agent registration

**Consequences**:
- (+) Production-ready infrastructure
- (+) Built-in observability
- (+) Scalable to distributed deployment
- (-) More complex initial setup
- (-) Learning curve for AGNTCY stack

---

### ADR-003: Model Selection Strategy

**Status**: Accepted

**Context**:
Need to balance quality and cost across orchestrator and grading agents.

**Decision**:
- **Orchestrator**: Claude Opus 4.5 (highest quality for routing decisions)
- **Graders**: Claude Sonnet 4 (best quality/cost for grading)

**Rationale**:
- Orchestrator makes critical routing and evaluation decisions
- Graders process many requests; Sonnet provides excellent quality at lower cost
- Can optimize further in V1 based on telemetry

**Consequences**:
- (+) Optimal quality for critical decisions
- (+) Cost-effective for high-volume grading
- (-) Higher orchestrator costs

---

### ADR-004: Frontend Technology

**Status**: Accepted

**Context**:
Need responsive web interface for file uploads and results display.

**Decision**:
Use **React with Vite** (separate SPA) + **FastAPI** backend.

**Rationale**:
- React ecosystem has mature file upload components
- Vite provides fast development experience
- Separation of frontend/backend enables independent deployment
- FastAPI is optimal for Python ML/AI workloads

**Consequences**:
- (+) Fast development cycle
- (+) Rich component ecosystem
- (+) Clear separation of concerns
- (-) Two separate deployments for MVP

---

### ADR-005: Storage Strategy (MVP)

**Status**: Accepted

**Context**:
MVP needs simple, local storage without external dependencies.

**Decision**:
Use **SQLite** for structured data + **JSON files** for OCR outputs + **local file system** for uploads.

**Rationale**:
- Zero external dependencies
- Easy to inspect and debug
- Sufficient for MVP scale
- Can migrate to Supabase/Postgres in V1

**Consequences**:
- (+) No setup required
- (+) Easy debugging
- (+) Portable
- (-) Not suitable for multi-user production
- (-) Manual backup needed

---

### ADR-006: Rubric Input Format

**Status**: Accepted

**Context**:
Instructors need to provide grading rubrics. May have sample answers as images.

**Decision**:
Support **Text (JSON/TXT) + Image** rubrics.

**Rationale**:
- Text rubrics are common and easy to parse
- Sample answer images provide visual reference
- Claude Vision can extract text from image rubrics
- Flexibility for different instructor preferences

**Consequences**:
- (+) Flexible input options
- (+) Supports visual sample answers
- (-) More complex parsing logic

---

## 5. Project Structure

```
gr8r/
├── .claude/                          # Claude Code configuration
│   └── CLAUDE.md                     # Tech stack documentation
├── docs/
│   ├── start.txt                     # Original requirements
│   ├── eyepop_docs_overview.md       # OCR research
│   ├── agntcy_docs_overview.md       # Orchestration research
│   ├── plan.md                       # This file
│   └── TODO.md                       # Task tracking
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── config.py                 # Configuration
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── upload.py         # File upload endpoints
│   │   │   │   ├── grade.py          # Grading endpoints
│   │   │   │   ├── results.py        # Results endpoints
│   │   │   │   └── status.py         # Status endpoints
│   │   │   └── deps.py               # Dependencies
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ocr_service.py        # Claude Vision OCR
│   │   │   ├── triplet_service.py    # Triplet formation
│   │   │   ├── grading_service.py    # Orchestration trigger
│   │   │   └── storage_service.py    # File/DB operations
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py       # Main orchestrator (Opus 4.5)
│   │   │   ├── graders/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base_grader.py    # Base grader class
│   │   │   │   ├── math_grader.py    # Math specialist
│   │   │   │   ├── english_grader.py # English specialist
│   │   │   │   └── science_grader.py # Science specialist
│   │   │   ├── evaluator.py          # Grade evaluation logic
│   │   │   └── prompts/
│   │   │       ├── orchestrator.txt
│   │   │       ├── math.txt
│   │   │       ├── english.txt
│   │   │       └── science.txt
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py            # Pydantic models
│   │   │   └── database.py           # SQLite models
│   │   └── core/
│   │       ├── __init__.py
│   │       └── langgraph_setup.py    # LangGraph configuration
│   ├── data/
│   │   ├── uploads/                  # Uploaded files
│   │   ├── outputs/                  # JSON outputs
│   │   └── gr8r.db                   # SQLite database
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_ocr.py
│   │   ├── test_grading.py
│   │   └── fixtures/
│   ├── environment.yml               # Conda environment
│   └── requirements.txt              # Pip requirements
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ProcessingStatus.tsx
│   │   │   ├── ResultsDashboard.tsx
│   │   │   └── QuestionResult.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── hooks/
│   │   │   └── useGrading.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

---

## 6. Conda Environment File

**File: `environment.yml`** (will replace existing)

```yaml
name: gr8r
channels:
  - conda-forge
  - defaults
dependencies:
  # Core Python
  - python=3.12
  - pip=25.3

  # Scientific stack
  - numpy
  - pandas
  - pillow

  # Database
  - sqlite

  # Development tools
  - pytest
  - black
  - ruff

  - pip:
      # ===== BACKEND FRAMEWORK =====
      - fastapi>=0.115.0
      - uvicorn[standard]>=0.34.0
      - python-multipart  # File uploads
      - pydantic>=2.10.0
      - pydantic-settings>=2.7.0

      # ===== AI/LLM =====
      - anthropic>=0.45.0
      - langchain>=0.3.0
      - langchain-anthropic>=0.3.0
      - langchain-core>=0.3.0
      - langgraph>=0.4.0

      # ===== AGNTCY STACK =====
      - agntcy-app-sdk
      - agntcy-acp
      - ioa_observe_sdk

      # ===== OCR & DOCUMENT PROCESSING =====
      - pypdf>=5.0.0
      - pdf2image

      # ===== ASYNC & HTTP =====
      - httpx>=0.28.0
      - aiofiles

      # ===== UTILITIES =====
      - python-dotenv>=1.0.0
      - tenacity  # Retry logic
      - structlog  # Structured logging

      # ===== EXISTING DEPENDENCIES (preserved) =====
      - flask
      - flask-cors
      - langchain-community
      - eyepop>=3.9.0
      - matplotlib
```

---

## 7. Verification Plan

### How to test the MVP end-to-end:

1. **Start backend**: `conda activate gr8r && uvicorn app.main:app --reload`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Test upload flow**:
   - Upload sample question paper image
   - Upload sample answer sheet image
   - Upload text rubric
4. **Trigger grading**: Click "Grade" button
5. **Verify OCR**: Check `/data/outputs/` for JSON files
6. **Verify grading**: Check results dashboard displays scores
7. **Check logs**: Verify AGNTCY Observe traces

---

## 8. Version Roadmap

### MVP (Current Focus)
**Goal: Core Pipeline & Local Development**

- [ ] OCR ingestion using Claude Vision
- [ ] Basic pipeline setup (OCR → Triplets → Grading)
- [ ] API endpoints for testing
- [ ] AGNTCY-based orchestration with LangGraph
- [ ] Local data storage (SQLite + JSON)
- [ ] Local frontend without users, stateless
- [ ] 3 grader agents (Math, English, Science)

### V1 (Future)
**Goal: Production-Ready Local Deployment**

- [ ] Instructor and student portals with polished UI
- [ ] Landing page for website
- [ ] Website hosted locally end-to-end with API endpoints working
- [ ] Custom OCR training for improved accuracy
- [ ] Agent observability setup (AGNTCY Observe SDK)
- [ ] Cost and latency optimization
- [ ] User login system
- [ ] 5+ specialized grader agents:
  - Math, English, Science, History
  - Question-type specialists (MCQ, reasoning, etc.)

### V2 (Future)
**Goal: Production Hosting & Transparency**

- [ ] Different input cost and latency optimizations
- [ ] Actual cloud hosting (AWS/GCP/Azure)
- [ ] Actual backend setup (production infrastructure)
- [ ] Proper DevOps (CI/CD, monitoring, logging)
- [ ] Agent mapping chain-of-thought hooked to frontend for user transparency

---

## 9. References

- [EyePop.ai Research](./eyepop_docs_overview.md)
- [AGNTCY Research](./agntcy_docs_overview.md)
- [Original Requirements](./start.txt)
- [Architecture](./architecture.md)
- [ADRs](./ADRs.md)
- [User Flows](./user-flow.md)
- [System Flows](./system-flow.md)

# Gr8r - System Architecture

## Overview
This document describes the technical architecture of the Gr8r grading system, including all layers, components, and their interactions.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  GR8R SYSTEM ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                              PRESENTATION LAYER                              │
     │                                                                              │
     │   ┌───────────────────────────────────────────────────────────────────────┐ │
     │   │                         React + Vite (SPA)                            │ │
     │   │                                                                        │ │
     │   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │ │
     │   │  │  Upload  │  │ Status   │  │ Results  │  │    API Client        │  │ │
     │   │  │  Views   │  │ Display  │  │Dashboard │  │  (Axios/Fetch)       │  │ │
     │   │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘  │ │
     │   └───────────────────────────────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            │ HTTP/REST API
                                            │ (JSON)
                                            ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                                API LAYER                                     │
     │                                                                              │
     │   ┌───────────────────────────────────────────────────────────────────────┐ │
     │   │                          FastAPI (Python)                              │ │
     │   │                                                                        │ │
     │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
     │   │  │ POST        │  │ POST        │  │ GET         │  │ GET         │  │ │
     │   │  │ /upload/*   │  │ /grade      │  │ /status/:id │  │ /results/:id│  │ │
     │   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
     │   │                                                                        │ │
     │   │  ┌──────────────────────────────────────────────────────────────────┐ │ │
     │   │  │                    Request Validation (Pydantic)                  │ │ │
     │   │  └──────────────────────────────────────────────────────────────────┘ │ │
     │   └───────────────────────────────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                              SERVICE LAYER                                   │
     │                                                                              │
     │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
     │  │    Upload     │  │      OCR      │  │   Triplet     │  │   Storage    │ │
     │  │   Service     │  │   Service     │  │   Service     │  │   Service    │ │
     │  │               │  │               │  │               │  │              │ │
     │  │ • Validate    │  │ • Claude API  │  │ • Join Q&A    │  │ • SQLite     │ │
     │  │ • Store files │  │ • Extract txt │  │ • Match rubric│  │ • JSON files │ │
     │  │ • Generate ID │  │ • Parse JSON  │  │ • Build pairs │  │ • File I/O   │ │
     │  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘ │
     │                                                                              │
     │  ┌────────────────────────────────────────────────────────────────────────┐ │
     │  │                          Grading Service                                │ │
     │  │  • Orchestrate pipeline  • Trigger agents  • Collect results           │ │
     │  └────────────────────────────────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                          AGENT ORCHESTRATION LAYER                           │
     │                          (LangGraph + AGNTCY Stack)                          │
     │                                                                              │
     │  ┌────────────────────────────────────────────────────────────────────────┐ │
     │  │                    ORCHESTRATOR (Claude Opus 4.5)                       │ │
     │  │                                                                         │ │
     │  │    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │ │
     │  │    │  Analyze    │───▶│   Route     │───▶│  Evaluate   │               │ │
     │  │    │  Question   │    │  to Grader  │    │   Results   │               │ │
     │  │    └─────────────┘    └─────────────┘    └─────────────┘               │ │
     │  │                              │                   │                      │ │
     │  │                              │              [feedback]                  │ │
     │  │                              │                   │                      │ │
     │  │              ┌───────────────┼───────────────┐   │                      │ │
     │  │              ▼               ▼               ▼   │                      │ │
     │  │       ┌───────────┐   ┌───────────┐   ┌───────────┐                    │ │
     │  │       │   Math    │   │  English  │   │  Science  │                    │ │
     │  │       │  Grader   │   │  Grader   │   │  Grader   │                    │ │
     │  │       │(Sonnet 4) │   │(Sonnet 4) │   │(Sonnet 4) │                    │ │
     │  │       └─────┬─────┘   └─────┬─────┘   └─────┬─────┘                    │ │
     │  │             │               │               │                          │ │
     │  │             └───────────────┼───────────────┘                          │ │
     │  │                             ▼                                           │ │
     │  │                    ┌─────────────────┐                                  │ │
     │  │                    │  Grading Result │                                  │ │
     │  │                    │  {score, reason, feedback for student}│            | │
     │  │                    └─────────────────┘                                  │ │
     │  └────────────────────────────────────────────────────────────────────────┘ │
     │                                                                              │
     │  ┌────────────────────────────────────────────────────────────────────────┐ │
     │  │                      AGNTCY INFRASTRUCTURE                              │ │
     │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
     │  │  │    SLIM     │  │     A2A     │  │   Observe   │  │    OASF     │   │ │
     │  │  │  Transport  │  │  Protocol   │  │     SDK     │  │   Schema    │   │ │
     │  │  │ (Messaging) │  │  (Comms)    │  │ (Tracing)   │  │ (Discovery) │   │ │
     │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
     │  └────────────────────────────────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                             EXTERNAL SERVICES                                │
     │                                                                              │
     │  ┌────────────────────────────────────────────────────────────────────────┐ │
     │  │                       Anthropic Claude API                              │ │
     │  │                                                                         │ │
     │  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │ │
     │  │  │  Claude Vision  │    │   Opus 4.5      │    │   Sonnet 4      │    │ │
     │  │  │  (OCR)          │    │ (Orchestrator)  │    │  (Graders)      │    │ │
     │  │  └─────────────────┘    └─────────────────┘    └─────────────────┘    │ │
     │  └────────────────────────────────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                              DATA LAYER (MVP)                                │
     │                                                                              │
     │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────────────┐│
     │  │   SQLite DB    │  │  JSON Files    │  │       File Storage              ││
     │  │                │  │                │  │                                 ││
     │  │ • sessions     │  │ • questions.json│ │ /data/uploads/                  ││
     │  │ • results      │  │ • answers.json │  │   ├── session_123/              ││
     │  │ • metadata     │  │ • triplets.json│  │   │   ├── questions/            ││
     │  │                │  │ • results.json │  │   │   ├── answers/              ││
     │  │                │  │                │  │   │   └── rubric/               ││
     │  └────────────────┘  └────────────────┘  └─────────────────────────────────┘│
     └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Backend Components

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   │   └── Creates app instance, includes routers, configures CORS
│   │
│   ├── config.py               # Configuration management
│   │   └── Environment variables, settings, constants
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── upload.py       # POST /api/upload/{type}
│   │   │   │   └── Handle file uploads, validation, storage
│   │   │   │
│   │   │   ├── grade.py        # POST /api/grade
│   │   │   │   └── Trigger grading pipeline, return job ID
│   │   │   │
│   │   │   ├── status.py       # GET /api/status/{session_id}
│   │   │   │   └── Return processing status, progress percentage
│   │   │   │
│   │   │   └── results.py      # GET /api/results/{session_id}
│   │   │       └── Return grading results, scores, feedback
│   │   │
│   │   └── deps.py             # Dependency injection
│   │       └── Database sessions, service instances
│   │
│   ├── services/
│   │   ├── upload_service.py   # File handling logic
│   │   │   ├── validate_file() - Check format, size
│   │   │   ├── save_file()     - Store to filesystem
│   │   │   └── generate_id()   - Create session ID
│   │   │
│   │   ├── ocr_service.py      # Claude Vision integration
│   │   │   ├── extract_questions() - OCR question paper
│   │   │   ├── extract_answers()   - OCR answer sheets
│   │   │   └── process_rubric()    - Parse rubric content
│   │   │
│   │   ├── triplet_service.py  # Data joining
│   │   │   ├── match_questions_answers() - Align by question ID
│   │   │   ├── apply_rubric()            - Add grading criteria
│   │   │   └── build_triplets()          - Create final structure
│   │   │
│   │   ├── grading_service.py  # Orchestration trigger
│   │   │   ├── start_grading()  - Initialize pipeline
│   │   │   ├── get_status()     - Check progress
│   │   │   └── get_results()    - Retrieve scores
│   │   │
│   │   └── storage_service.py  # Persistence
│   │       ├── save_json()      - Write JSON files
│   │       ├── load_json()      - Read JSON files
│   │       └── db_operations()  - SQLite CRUD
│   │
│   ├── agents/
│   │   ├── orchestrator.py     # Main orchestration agent
│   │   │   ├── analyze_question()   - Determine subject/type
│   │   │   ├── route_to_grader()    - Select appropriate agent
│   │   │   ├── evaluate_result()    - Check grading quality
│   │   │   └── aggregate_scores()   - Combine all grades
│   │   │
│   │   ├── graders/
│   │   │   ├── base_grader.py      # Abstract base class
│   │   │   │   └── grade() - Abstract method
│   │   │   │
│   │   │   ├── math_grader.py      # Mathematics specialist
│   │   │   │   └── Custom rubric for calculations, methodology
│   │   │   │
│   │   │   ├── english_grader.py   # Language specialist
│   │   │   │   └── Custom rubric for grammar, content, structure
│   │   │   │
│   │   │   └── science_grader.py   # Science specialist
│   │   │       └── Custom rubric for concepts, accuracy
│   │   │
│   │   ├── evaluator.py        # Result validation
│   │   │   ├── check_confidence()  - Verify score certainty
│   │   │   └── request_regrade()   - Trigger re-evaluation
│   │   │
│   │   └── prompts/            # System prompts (text files)
│   │       ├── orchestrator.txt
│   │       ├── math.txt
│   │       ├── english.txt
│   │       └── science.txt
│   │
│   ├── models/
│   │   ├── schemas.py          # Pydantic models
│   │   │   ├── UploadRequest
│   │   │   ├── GradeRequest
│   │   │   ├── StatusResponse
│   │   │   ├── ResultsResponse
│   │   │   ├── QuestionTriplet
│   │   │   └── GradingResult
│   │   │
│   │   └── database.py         # SQLAlchemy models
│   │       ├── Session
│   │       ├── GradingJob
│   │       └── Result
│   │
│   └── core/
│       └── langgraph_setup.py  # LangGraph configuration
│           ├── GradingState    - TypedDict for state
│           ├── create_graph()  - Build workflow graph
│           └── compile()       - Ready for execution
│
├── data/
│   ├── uploads/                # Uploaded files (per session)
│   ├── outputs/                # JSON processing outputs
│   └── gr8r.db                 # SQLite database
│
└── tests/
    ├── test_ocr.py             # OCR service tests
    ├── test_grading.py         # Agent tests
    └── fixtures/               # Sample documents
```

### 2.2 Frontend Components

```
frontend/
└── src/
    ├── App.tsx                 # Main application component
    │   └── Router, layout, global state
    │
    ├── main.tsx                # Entry point
    │   └── React DOM render
    │
    ├── components/
    │   ├── FileUpload.tsx      # Upload component
    │   │   ├── Drag & drop zone
    │   │   ├── File picker
    │   │   ├── Preview thumbnails
    │   │   └── Upload progress
    │   │
    │   ├── ProcessingStatus.tsx # Status display
    │   │   ├── Progress bar
    │   │   ├── Step indicators
    │   │   └── Estimated time
    │   │
    │   ├── ResultsDashboard.tsx # Results view
    │   │   ├── Total score summary
    │   │   ├── Question list
    │   │   └── Export buttons
    │   │
    │   └── QuestionResult.tsx  # Individual result
    │       ├── Score display
    │       ├── Reasoning section
    │       └── Feedback section
    │
    ├── api/
    │   └── client.ts           # API client
    │       ├── uploadFiles()
    │       ├── startGrading()
    │       ├── getStatus()
    │       └── getResults()
    │
    ├── hooks/
    │   └── useGrading.ts       # Custom hook
    │       ├── State management
    │       ├── API calls
    │       └── Polling logic
    │
    └── types/
        └── index.ts            # TypeScript types
            ├── Session
            ├── UploadedFile
            ├── GradingStatus
            └── GradingResult
```

---

## 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW PIPELINE                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

STAGE 1: INPUT
══════════════
   [Question Paper]        [Answer Sheets]         [Rubric]
    (images/pdf)            (images/pdf)          (txt/json/img)
         │                       │                      │
         ▼                       ▼                      ▼
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │ Validate│            │ Validate│            │ Validate│
    │  Format │            │  Format │            │  Format │
    └────┬────┘            └────┬────┘            └────┬────┘
         │                      │                      │
         ▼                      ▼                      ▼
    /uploads/              /uploads/              /uploads/
    session_id/            session_id/            session_id/
    questions/             answers/               rubric/


STAGE 2: OCR (Claude Vision)
════════════════════════════
    ┌─────────────────────────────────────────────────────────────┐
    │                     Claude Vision API                        │
    │                                                              │
    │   Input: Base64 encoded images                              │
    │   Prompt: "Extract text and structure as JSON..."           │
    │   Output: Structured JSON                                    │
    └─────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ questions.json  │ │  answers.json   │ │  rubric.json    │
    │                 │ │                 │ │                 │
    │ {               │ │ {               │ │ {               │
    │   "questions":[ │ │   "answers": [  │ │   "criteria": { │
    │     {           │ │     {           │ │     "Q1": {     │
    │       "id":"Q1",│ │       "q_id":   │ │       "points": │
    │       "text":.. │ │         "Q1",   │ │         [...],  │
    │       "score":10│ │       "text":.. │ │       "sample": │
    │     }           │ │     }           │ │         "..."   │
    │   ]             │ │   ]             │ │     }           │
    │ }               │ │ }               │ │   }             │
    └─────────────────┘ └─────────────────┘ │ }               │
                                            └─────────────────┘


STAGE 3: TRIPLET FORMATION
══════════════════════════
    questions.json ─────┐
                        │
    answers.json   ─────┼────▶  JOIN on question_id
                        │
    rubric.json    ─────┘
                               │
                               ▼
                    ┌─────────────────────────────────────────┐
                    │              triplets.json               │
                    │                                          │
                    │  [                                       │
                    │    {                                     │
                    │      "question_id": "Q1",                │
                    │      "question_text": "Explain...",      │
                    │      "max_score": 10,                    │
                    │      "candidate_answer": "Student...",   │
                    │      "expected_answer": {                │
                    │        "key_points": [...],              │
                    │        "sample": "..."                   │
                    │      }                                   │
                    │    },                                    │
                    │    ...                                   │
                    │  ]                                       │
                    └─────────────────────────────────────────┘


STAGE 4: GRADING (LangGraph)
════════════════════════════
    triplets.json
         │
         ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   LangGraph Workflow                         │
    │                                                              │
    │   START ──▶ Orchestrator ──▶ Router ──┬──▶ Math Grader      │
    │                                       ├──▶ English Grader   │
    │                                       └──▶ Science Grader   │
    │                                              │               │
    │                          ┌───────────────────┘               │
    │                          ▼                                   │
    │                     Evaluator                                │
    │                          │                                   │
    │           ┌──────────────┴──────────────┐                   │
    │           ▼                             ▼                   │
    │     [confidence OK]              [confidence LOW]           │
    │           │                             │                   │
    │           ▼                             ▼                   │
    │       Approve                      Re-grade                 │
    │           │                             │                   │
    │           └──────────────┬──────────────┘                   │
    │                          ▼                                   │
    │                        END                                   │
    └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────────────────────┐
                    │            grading_results.json          │
                    │                                          │
                    │  [                                       │
                    │    {                                     │
                    │      "question_id": "Q1",                │
                    │      "score": 8,                         │
                    │      "max_score": 10,                    │
                    │      "grader": "science_grader",         │
                    │      "confidence": 0.92,                 │
                    │      "reasoning": "Student correctly...",│
                    │      "feedback": "Good understanding..." │
                    │    },                                    │
                    │    ...                                   │
                    │  ]                                       │
                    └─────────────────────────────────────────┘


STAGE 5: OUTPUT
═══════════════
    grading_results.json
         │
         ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    Results Dashboard                         │
    │                                                              │
    │   ┌───────────────────────────────────────────────────────┐ │
    │   │ Total: 23/30 (76.7%)                                  │ │
    │   ├───────────────────────────────────────────────────────┤ │
    │   │ Q1 (Science): 8/10   [████████░░]                     │ │
    │   │ Q2 (Math):    5/5    [██████████]                     │ │
    │   │ Q3 (English): 10/15  [██████░░░░]                     │ │
    │   └───────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack Details

### 4.1 Backend Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Web Framework | FastAPI 0.115+ | Async API endpoints |
| Validation | Pydantic 2.10+ | Request/response models |
| Database | SQLite | Session and result storage |
| ORM | SQLAlchemy | Database operations |
| Agent Framework | LangGraph 0.4+ | Multi-agent orchestration |
| Agent Infra | AGNTCY Stack | Communication, observability |
| LLM Provider | Anthropic | Claude Vision, Opus, Sonnet |
| Async | asyncio, aiofiles | Non-blocking I/O |
| Logging | structlog | Structured logging |

### 4.2 Frontend Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18+ | UI components |
| Build Tool | Vite | Fast development |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| HTTP Client | Axios | API calls |
| State | React hooks | Local state management |

### 4.3 AI/ML Stack

| Component | Model | Purpose |
|-----------|-------|---------|
| OCR | Claude Vision | Handwriting extraction |
| Orchestrator | Claude Opus 4.5 | Routing, evaluation |
| Math Grader | Claude Sonnet 4 | Math grading |
| English Grader | Claude Sonnet 4 | Language grading |
| Science Grader | Claude Sonnet 4 | Science grading |

---

## 5. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS (MVP)                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TRANSPORT LAYER                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  HTTPS (Production) / HTTP (Development)                                        ││
│  │  • TLS 1.3 encryption                                                           ││
│  │  • Certificate validation                                                        ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  API LAYER                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  FastAPI Security Features                                                       ││
│  │  • CORS configuration (allowed origins)                                          ││
│  │  • Request validation (Pydantic)                                                ││
│  │  • File type validation                                                          ││
│  │  • File size limits (50MB max)                                                   ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  Data Protection                                                                 ││
│  │  • Session-based file isolation                                                  ││
│  │  • No persistent user data (MVP)                                                ││
│  │  • Local file storage only                                                       ││
│  │  • API key stored in environment variables                                       ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL API LAYER                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  Anthropic API                                                                   ││
│  │  • API key authentication                                                        ││
│  │  • Rate limiting (handled by Anthropic)                                         ││
│  │  • Data processing agreement                                                     ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Version Roadmap & Scalability

### MVP (Current)
**Focus: Core Pipeline & Local Development**

| Component | Implementation |
|-----------|----------------|
| **OCR** | Claude Vision for handwriting extraction |
| **Pipeline** | Basic OCR → Triplets → Grading flow |
| **API** | FastAPI endpoints for testing |
| **Orchestration** | LangGraph + AGNTCY stack |
| **Storage** | SQLite + JSON files (local) |
| **Frontend** | React SPA, stateless, no user accounts |
| **Graders** | 3 agents (Math, English, Science) |

**Technical Characteristics:**
- Single process, local storage
- Synchronous/async processing
- No authentication required
- Local development only

---

### V1 (Future)
**Focus: Production-Ready Local Deployment**

| Component | Implementation |
|-----------|----------------|
| **Frontend** | Instructor & Student portals with polished UI |
| **Landing Page** | Marketing/info page for the product |
| **Hosting** | Locally hosted end-to-end (full stack working) |
| **OCR** | Custom trained models for improved accuracy |
| **Observability** | AGNTCY Observe SDK fully integrated |
| **Optimization** | Cost and latency improvements |
| **Auth** | User login system (instructor/student roles) |
| **Graders** | 5+ specialized agents |

**Expanded Grader Agents:**
- Math Grader
- English Grader
- Science Grader
- History Grader
- Question-Type Specialists:
  - MCQ Grader
  - Assertion-Reasoning Grader
  - Compare/Contrast Grader
  - Elucidate/Explain Grader

**Technical Characteristics:**
- Background job processing (Celery/RQ)
- PostgreSQL database
- Redis for caching/sessions
- Multiple grading workers
- User session management

---

### V2 (Future)
**Focus: Production Hosting & Transparency**

| Component | Implementation |
|-----------|----------------|
| **Hosting** | Cloud deployment (AWS/GCP/Azure) |
| **Backend** | Production-grade infrastructure |
| **DevOps** | CI/CD, monitoring, logging, alerts |
| **Optimization** | Multi-tier cost/latency optimization |
| **Transparency** | Agent chain-of-thought visible in UI |

**Agent Transparency Features:**
- Real-time grading progress display
- Chain-of-thought reasoning shown to users
- Step-by-step agent decision visualization
- Confidence scores visible per question
- Re-grading triggers exposed in UI

**Technical Characteristics:**
- Kubernetes deployment
- Distributed AGNTCY agents across nodes
- CDN for static assets
- Auto-scaling based on load
- Full observability stack (Grafana, Prometheus)
- Disaster recovery & backups

---

### Version Comparison

| Feature | MVP | V1 | V2 |
|---------|-----|----|----|
| OCR | Claude Vision | + Custom training | + Multi-provider |
| Graders | 3 | 5+ | 10+ |
| Storage | SQLite | PostgreSQL | Managed DB |
| Hosting | Local | Local (full) | Cloud |
| Users | None | Auth system | Multi-tenant |
| Observability | Basic logs | AGNTCY Observe | Full stack |
| UI | Basic upload | Polished portals | + CoT display |
| DevOps | Manual | Basic | Full CI/CD |

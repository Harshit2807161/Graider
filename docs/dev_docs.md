# Gr8r - Complete Developer Documentation

> **Purpose**: Comprehensive codebase documentation for developer handoff and independent development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Core Components](#core-components)
4. [API Endpoints](#api-endpoints)
5. [Data Models & Schemas](#data-models--schemas)
6. [Services Layer](#services-layer)
7. [Agent Architecture](#agent-architecture)
8. [Database Schema](#database-schema)
9. [LangGraph State Setup](#langgraph-state-setup)
10. [Data Flow](#data-flow)
11. [File Organization & Outputs](#file-organization--outputs)
12. [Technical Decisions](#technical-decisions)
13. [Known Limitations](#known-limitations)
14. [Quick Start](#quick-start)
15. [Roadmap](#roadmap)

---

## Project Overview

**Gr8r** is an AI-powered grading system that grades handwritten subjective answers using multi-agent orchestration. It uses Claude Vision for OCR extraction and specialized Claude-based agents for subject-specific grading.

**Current Status**: MVP Phase (Backend mostly complete, frontend minimal)

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend Framework** | FastAPI (Python 3.12) |
| **OCR** | Claude Vision API (Anthropic) |
| **Agent Orchestration** | LangGraph |
| **Database** | SQLite (MVP) → PostgreSQL (V1) |
| **AI Models** | Claude Opus 4.5 (Orchestrator), Claude Sonnet 4 (Graders) |
| **Frontend** | React 18+ with Vite (placeholder) |

---

## Directory Structure

```
gr8r/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                          # FastAPI entry point
│   │   ├── config.py                        # Configuration & environment
│   │   ├── agents/
│   │   │   ├── orchestrator.py              # LangGraph-based orchestrator (Opus 4.5)
│   │   │   ├── graders/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base_grader.py           # Abstract base class for graders
│   │   │   │   ├── math_grader.py           # Math specialist (Sonnet 4)
│   │   │   │   ├── english_grader.py        # English specialist (Sonnet 4)
│   │   │   │   ├── science_grader.py        # Science specialist (Sonnet 4)
│   │   │   │   └── history_grader.py        # History specialist (Sonnet 4)
│   │   │   └── prompts/                     # (Empty - prompts embedded in graders)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── upload.py                # File upload endpoints
│   │   │       ├── grade.py                 # Trigger grading pipeline
│   │   │       ├── status.py                # Check session status
│   │   │       └── results.py               # Retrieve grading results
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── langgraph_setup.py           # LangGraph state definitions
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py                   # Pydantic models & enums
│   │   │   └── database.py                  # SQLite database manager
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── grading_service.py           # Main pipeline orchestrator
│   │       ├── ocr_service.py               # Claude Vision OCR extraction
│   │       ├── triplet_service.py           # Q-A-Rubric joining logic
│   │       └── pdf_service.py               # PDF → Image conversion
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                      # Pytest fixtures
│   │   ├── test_ocr.py                      # OCR service tests
│   │   ├── test_grading.py                  # Agent grading tests
│   │   ├── test_pipeline.py                 # End-to-end pipeline tests
│   │   └── fixtures/                        # Test fixture files
│   ├── test_client.py                       # Manual testing script
│   ├── requirements.txt                     # Python dependencies
│   ├── .env.example                         # Environment template
│   └── data/
│       ├── uploads/                         # Session upload directories
│       └── outputs/                         # Processing outputs
├── frontend/
│   └── src/                                 # React application (minimal)
├── docs/
│   ├── plan.md                              # Implementation roadmap
│   ├── TODO.md                              # Current tasks
│   ├── architecture.md                      # Detailed architecture
│   ├── start.txt                            # Original requirements
│   ├── system-flow.md                       # Process flows
│   ├── user-flow.md                         # User interactions
│   ├── agntcy_docs_overview.md              # AGNTCY stack research
│   ├── eyepop_docs_overview.md              # EyePop research
│   ├── ADRs.md                              # Architecture decision records
│   └── prompts.txt                          # Prompt engineering notes
├── environment.yml                          # Conda environment spec
├── CHANGELOG.md
└── README.md
```

---

## Core Components

### Configuration (`backend/app/config.py`)

The `Settings` class loads all configuration from environment variables with sensible defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `anthropic_api_key` | Required | Anthropic API key |
| `claude_orchestrator_model` | `claude-opus-4-5-20250929` | Model for orchestrator |
| `claude_grader_model` | `claude-sonnet-4-20250514` | Model for graders |
| `claude_vision_model` | `claude-sonnet-4-20250514` | Model for OCR |
| `upload_dir` | `./data/uploads` | Upload storage path |
| `output_dir` | `./data/outputs` | Output storage path |
| `database_url` | `sqlite:///./data/gr8r.db` | Database connection |
| `api_host` | `0.0.0.0` | API host |
| `api_port` | `8000` | API port |
| `debug` | `true` | Debug mode |
| `cors_origins` | `localhost:5173,localhost:3000` | CORS origins |
| `log_level` | `INFO` | Logging level |

**Usage**:
```python
from app.config import get_settings

settings = get_settings()
print(settings.anthropic_api_key)
```

---

## API Endpoints

### Upload Endpoints (`/api/upload/`)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/questions` | Upload question paper images/PDFs | `multipart/form-data` with files |
| POST | `/answers` | Upload student answer sheet images/PDFs | `multipart/form-data` with files |
| POST | `/combined` | Upload document with both Q&A | `multipart/form-data` with files |
| POST | `/rubric` | Upload grading rubric | `multipart/form-data` with files |

**Response**: Returns `session_id` (UUID) for tracking

### Grading Endpoints (`/api/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/grade` | Trigger grading pipeline for a session |
| GET | `/status/{session_id}` | Check processing status and progress |
| GET | `/results/{session_id}` | Retrieve final grading results |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint with API info |
| GET | `/health` | Health check |

---

## Data Models & Schemas

Located in `backend/app/models/schemas.py`

### Enums

```python
class QuestionType(str, Enum):
    descriptive = "descriptive"
    problem = "problem"
    mcq = "mcq"
    short_answer = "short_answer"
    essay = "essay"
    assertion_reasoning = "assertion_reasoning"
    differentiate = "differentiate"
    elucidate = "elucidate"

class Subject(str, Enum):
    math = "math"
    english = "english"
    science = "science"
    history = "history"
    general = "general"

class ProcessingStatus(str, Enum):
    pending = "pending"
    uploading = "uploading"
    ocr_processing = "ocr_processing"
    triplet_forming = "triplet_forming"
    grading = "grading"
    completed = "completed"
    failed = "failed"
```

### Core Models

#### Question
```python
class Question(BaseModel):
    id: str                        # Q1, Q2a, etc.
    text: str                      # Full question text
    max_score: float               # Maximum marks
    question_type: QuestionType    # Type classification
    subject: Optional[Subject]     # Auto-detected subject
```

#### Answer
```python
class Answer(BaseModel):
    question_id: str               # Matching question ID
    text: str                      # Student's answer
    confidence: float              # OCR confidence (0.0-1.0)
```

#### RubricCriteria
```python
class RubricCriteria(BaseModel):
    question_id: str
    expected_points: list[str]     # Key points to look for
    sample_answer: Optional[str]   # Model answer
    scoring_guide: dict            # {"full": 1.0, "partial": 0.5, "minimal": 0.2}
```

#### Triplet (Q-A-R combination)
```python
class Triplet(BaseModel):
    question_id: str
    question_text: str
    question_type: QuestionType
    subject: Subject
    candidate_answer: str          # Student's answer
    expected_answer: Optional[RubricCriteria]
    max_score: float
```

#### GradingResult
```python
class GradingResult(BaseModel):
    question_id: str
    score: float                   # Awarded score
    max_score: float
    percentage: float              # Auto-calculated
    reasoning: str                 # Why this score was given
    feedback: str                  # Improvement suggestions
    grader: str                    # Which agent graded
    confidence: float              # Grader's confidence level
```

#### SessionStatus
```python
class SessionStatus(BaseModel):
    session_id: UUID
    status: ProcessingStatus
    progress: float                # 0-100%
    current_step: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
```

---

## Services Layer

### 1. OCR Service (`backend/app/services/ocr_service.py`)

**Purpose**: Extract text from images/PDFs using Claude Vision

**Class**: `OCRService`

**Key Methods**:

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `extract_questions()` | `images_dir: Path` | `list[Question]` | Extract questions from images |
| `extract_answers()` | `images_dir: Path, questions: list[Question]` | `list[Answer]` | Extract answers with question context |
| `extract_questions_and_answers()` | `images_dir: Path` | `tuple[list[Question], list[Answer]]` | Extract both from combined doc |
| `extract_rubric()` | `rubric_dir: Path` | `list[RubricCriteria]` | Extract rubric criteria |

**Implementation Details**:
- Uses Claude Sonnet 4 (`claude-sonnet-4-20250514`) for vision tasks
- Base64 encodes images for API transmission
- Parses JSON responses (handles markdown code blocks)
- Supports image formats: JPG, PNG, GIF, WebP
- Integrates with PDF service for PDF → image conversion
- Provides extracted PDF text as additional context

**Example Usage**:
```python
from app.services.ocr_service import OCRService
from app.config import get_settings

service = OCRService(get_settings())
questions = await service.extract_questions(Path("./uploads/session123/questions"))
```

---

### 2. Triplet Service (`backend/app/services/triplet_service.py`)

**Purpose**: Join questions, answers, and rubrics into grading triplets

**Class**: `TripletService`

**Key Methods**:

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `form_triplets()` | `questions, answers, rubric_criteria` | `list[Triplet]` | Create Q-A-R triplets |
| `detect_subject()` | `question: Question` | `Subject` | Classify question subject |
| `save_triplets()` | `triplets, output_path` | `None` | Save triplets to JSON |
| `load_triplets()` | `input_path` | `list[Triplet]` | Load triplets from JSON |

**Subject Detection Keywords**:

| Subject | Keywords |
|---------|----------|
| Math | calculate, solve, equation, formula, graph, √, ∫, derivative, algebra |
| Science | experiment, reaction, chemistry, photosynthesis, hypothesis, molecule |
| English | essay, poem, character, theme, comprehension, grammar, narrative |
| History | history, war, civilization, revolution, treaty, empire, dynasty |

**Fuzzy Matching**: Handles variations like `Q1`, `1`, `Q 1`, `Question 1`

---

### 3. PDF Service (`backend/app/services/pdf_service.py`)

**Purpose**: Convert PDFs to images and extract text

**Class**: `PDFService`

**Key Methods**:

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `convert_pdf_to_images()` | `pdf_path, output_dir, prefix` | `list[Path]` | Convert PDF pages to PNG images |
| `extract_text_from_pdf()` | `pdf_path` | `str` | Extract embedded text from PDF |
| `process_pdf_for_ocr()` | `pdf_path, output_dir` | `tuple[list[Path], str]` | Convert + extract text |
| `process_directory_files()` | `directory` | `tuple[list[Path], list[str]]` | Process all files in directory |

**Configuration**:
- Default DPI: 200 (balance between quality and file size)
- Output format: PNG
- Libraries: `pdf2image`, `pypdf`

---

### 4. Grading Service (`backend/app/services/grading_service.py`)

**Purpose**: Orchestrate the complete grading pipeline

**Main Function**: `run_grading_pipeline(session_id, questions_path, answers_path, rubric_path)`

**Pipeline Steps**:

```
Step 1: OCR Processing (Progress: 10-45%)
├── Detect if combined document
├── Extract questions and answers
├── Extract rubric if provided
└── Save OCR outputs to JSON

Step 2: Triplet Formation (Progress: 50-55%)
├── Form question-answer-rubric triplets
├── Detect subjects
├── Handle mismatches
└── Save triplets

Step 3: Agent Grading (Progress: 60-95%)
├── For each triplet:
│   ├── Route to orchestrator
│   ├── Orchestrator tags and routes to specialist
│   ├── Specialist grades
│   ├── Evaluator reviews
│   └── Retry if low confidence
└── Save per-question results

Step 4: Aggregation (Progress: 95-100%)
├── Calculate total score
├── Generate performance summary
├── Save results JSON
└── Update database
```

---

## Agent Architecture

### Orchestrator (`backend/app/agents/orchestrator.py`)

**Class**: `LangGraphOrchestrator`

**Model**: Claude Opus 4.5 (`claude-opus-4-5-20250929`)

**LangGraph Workflow**:

```
START
  │
  ▼
┌─────────────────┐
│   tag_triplet   │ ← Classify subject & question type
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ route_to_grader │ ← Determine which specialist to use
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           SPECIALIZED GRADER                 │
│  (math_grader | english_grader | etc.)      │
└────────────────────┬────────────────────────┘
                     │
                     ▼
              ┌─────────────────┐
              │ evaluate_result │ ← Quality check
              └────────┬────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   [ACCEPTED]                    [REJECTED]
        │                             │
        ▼                             ▼
┌─────────────────┐         ┌──────────────────┐
│ finalize_result │         │ provide_feedback │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         ▼                           │ (retry, max 3 attempts)
        END                          └──────► route_to_grader
```

**Evaluation Criteria**:
- Rejects if confidence < 0.6
- Rejects if scoring seems unreasonable
- Provides specific feedback to grader for retry
- Maximum 3 attempts before accepting

---

### Base Grader (`backend/app/agents/graders/base_grader.py`)

**Abstract Class**: `BaseGrader`

**Model**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)

**Abstract Properties** (must implement in subclasses):
```python
@property
@abstractmethod
def name(self) -> str:
    """Grader identifier (e.g., 'math_grader')"""
    pass

@property
@abstractmethod
def system_prompt(self) -> str:
    """Subject-specific grading instructions"""
    pass
```

**Methods**:
- `grade(triplet: Triplet) → GradingResult`
- `grade_with_feedback(triplet: Triplet, evaluator_feedback: str) → GradingResult`

**Grading Process**:
1. Build structured grading prompt with triplet data
2. Call Claude API with system prompt
3. Parse JSON response (handles markdown blocks)
4. Validate score is within bounds [0, max_score]
5. Return `GradingResult`

---

### Specialized Graders

#### Math Grader (`math_grader.py`)

**Expertise**: Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Linear Algebra

**Key Principle**: Method matters more than final answer

**Scoring Guide**:
| Score Range | Criteria |
|-------------|----------|
| 100% | Correct answer with proper method shown |
| 75-90% | Correct method with minor computational error |
| 50-74% | Partial solution showing understanding |
| 25-49% | Some relevant work |
| 1-24% | Minimal content |
| 0% | Blank or completely wrong |

---

#### English Grader (`english_grader.py`)

**Expertise**: Comprehension, Essays, Grammar, Literary Analysis, Creative Writing

**Key Principle**: Content first, perfect grammar secondary

**Evaluation Criteria**:
- Thesis clarity and strength
- Development and support
- Organization and structure
- Language and style
- Conventions (grammar, spelling)
- Evidence and examples

---

#### Science Grader (`science_grader.py`)

**Expertise**: Physics, Chemistry, Biology, Earth Science, Scientific Method

**Key Principle**: Conceptual accuracy paramount, terminology important

**Evaluation Criteria**:
- Scientific accuracy
- Completeness of explanation
- Quality of reasoning
- Proper terminology usage
- Relevant examples

---

#### History Grader (`history_grader.py`)

**Expertise**: World History, Regional History, Political Science, Geography, Economics

**Key Principle**: Historical accuracy and causation crucial

**Evaluation Criteria**:
- Factual accuracy
- Chronological understanding
- Causation analysis
- Historical significance
- Contextual understanding
- Evidence usage

---

## Database Schema

Located in `backend/app/models/database.py`

### Sessions Table

```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,        -- UUID string
    status TEXT,                         -- ProcessingStatus value
    progress REAL,                       -- 0-100%
    current_step TEXT,                   -- Human-readable step
    error_message TEXT,                  -- Error details if failed
    questions_path TEXT,                 -- Directory path to questions
    answers_path TEXT,                   -- Directory path to answers
    rubric_path TEXT,                    -- Directory path to rubric
    triplets_json TEXT,                  -- JSON array of Triplet objects
    results_json TEXT,                   -- JSON array of GradingResult objects
    total_score REAL,                    -- Sum of all question scores
    max_total_score REAL,                -- Sum of all max scores
    summary TEXT,                        -- Overall performance summary
    created_at TEXT,                     -- ISO timestamp
    updated_at TEXT,                     -- ISO timestamp
    completed_at TEXT                    -- ISO timestamp when completed
);
```

### Database Manager

**Class**: `Database`

**Pattern**: Singleton via `get_database()` function

**Methods**:
```python
def create_session(session_id: str, questions_path: str = None, ...) -> None
def get_session(session_id: str) -> Optional[dict]
def update_session(session_id: str, **kwargs) -> None
def save_results(session_id: str, results: list, total: float, max_total: float, summary: str) -> None
def get_results(session_id: str) -> Optional[dict]
```

---

## LangGraph State Setup

Located in `backend/app/core/langgraph_setup.py`

### GradingState (TypedDict)

```python
class GradingState(TypedDict):
    triplet: dict                                    # Current triplet being graded
    rubric_context: Optional[str]                    # Additional rubric info
    subject_tag: str                                 # Detected subject
    question_type_tag: str                           # Detected question type
    assigned_grader: str                             # Which grader to use
    current_attempt: int                             # Current attempt number
    max_attempts: int                                # Maximum retry attempts (3)
    grading_attempts: Annotated[list[dict], operator.add]  # Accumulates attempts
    current_result: Optional[dict]                   # Latest grading result
    evaluator_feedback: Optional[str]                # Feedback for retry
    is_accepted: bool                                # Whether result accepted
    final_result: Optional[dict]                     # Final accepted result
```

### BatchGradingState (TypedDict)

```python
class BatchGradingState(TypedDict):
    triplets: list[dict]                             # All triplets to grade
    current_index: int                               # Current position
    results: Annotated[list[dict], operator.add]     # Accumulates results
    errors: Annotated[list[str], operator.add]       # Accumulates errors
```

### Helper Functions

```python
def subject_to_grader(subject: Subject) -> str
def question_type_to_string(qt: QuestionType) -> str
def create_initial_state(triplet: Triplet) -> GradingState
def create_batch_initial_state(triplets: list[Triplet]) -> BatchGradingState
def get_memory_saver() -> MemorySaver
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER UPLOADS FILES                              │
│                    Questions | Answers | Rubric (or Combined)                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    /upload/questions, /upload/answers, etc.
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE: SESSION CREATED                            │
│                         Status: PENDING → UPLOADING                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                          POST /grade with session_id
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GRADING PIPELINE STARTS (Background)                      │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
   │  OCR SERVICE  │        │TRIPLET SERVICE│        │AGENT GRADING  │
   │               │        │               │        │               │
   │ Claude Vision │   →    │ Q-A-R Joining │   →    │ Orchestrator  │
   │ Extract text  │        │ Subject detect│        │ → Specialists │
   │ from images   │        │ Form triplets │        │ → Evaluate    │
   └───────────────┘        └───────────────┘        └───────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGGREGATION                                     │
│              Calculate totals → Generate summary → Save results              │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE: SESSION COMPLETED                          │
│                         Results: Detailed scoring & feedback                 │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    GET /status/{session_id}, GET /results/{session_id}
                                     │
                                     ▼
                          ┌───────────────────┐
                          │  RESULTS TO USER  │
                          │  - Per-question   │
                          │  - Reasoning      │
                          │  - Feedback       │
                          │  - Total score    │
                          └───────────────────┘
```

---

## File Organization & Outputs

### Upload Structure
```
data/uploads/{session_id}/
├── questions/           # Question paper files
├── answers/             # Answer sheet files
├── combined/            # Combined document (if used)
└── rubric/              # Rubric files
```

### Output Structure
```
data/outputs/{session_id}/
├── questions.json       # Extracted questions
├── answers.json         # Extracted answers
├── rubric.json          # Extracted rubric (if provided)
├── triplets.json        # Formed triplets
├── results.json         # Grading results
└── summary.json         # Overall summary
```

---

## Technical Decisions

### 1. Claude Vision for OCR
- Handles handwritten and printed text without training
- Processes images directly (no pre-processing needed)
- PDFs converted to images via pdf2image

### 2. LangGraph for Orchestration
- Structured state management with checkpointing
- Conditional routing based on evaluation
- Feedback loops for quality control
- Debuggable workflow graphs

### 3. Specialized Graders per Subject
- Subject-specific prompts and evaluation criteria
- Routed by orchestrator based on question classification
- Fallback to general grader if detection fails

### 4. Evaluator Quality Check
- Orchestrator reviews grading results
- Rejects low-confidence results (< 0.6)
- Provides specific feedback for retry
- Maximum 3 attempts before accepting

### 5. Session-Based Architecture
- Each grading session = unique UUID
- Sessions track progress, status, results
- Enables resumable operations
- SQLite for MVP, PostgreSQL planned for V1

---

## Known Limitations

| Limitation | MVP Status | V1 Plan |
|------------|------------|---------|
| Subject Detection | Keyword-based | Claude classification |
| Prompts Directory | Empty (embedded in code) | External prompt files |
| AGNTCY Integration | Not implemented | Full integration |
| Frontend | Minimal placeholder | Full React UI |
| Observability | None | OpenTelemetry via ioa_observe_sdk |
| Database | SQLite | PostgreSQL |
| Async/Sync Mix | Some sync wrapping | Full async |

---

## Quick Start

### Environment Setup

```bash
# Activate conda environment
conda activate gr8r

# Copy environment template
cp backend/.env.example backend/.env

# Edit .env with your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-...

# Install dependencies
pip install -r backend/requirements.txt
```

### Run Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

### Manual Testing

```bash
cd backend
python test_client.py
```

---

## Roadmap

### MVP (Current)
- [x] OCR ingestion using Claude Vision
- [x] Basic pipeline setup (OCR → Triplets → Grading)
- [x] API endpoints for testing
- [x] Local data storage (SQLite + JSON)
- [x] 4 grader agents (Math, English, Science, History)
- [ ] Local frontend (stateless)

### V1 (Next Phase)
- [ ] PostgreSQL database
- [ ] Subject detection via Claude classification
- [ ] Instructor & student portals
- [ ] Agent observability (ioa_observe_sdk)
- [ ] 5+ specialized agents (MCQ, Reasoning)
- [ ] Cost optimization

### V2 (Future)
- [ ] Cloud hosting (AWS/GCP/Azure)
- [ ] Production DevOps (CI/CD, monitoring)
- [ ] Custom OCR training
- [ ] Advanced analytics dashboard
- [ ] User authentication system

---

## File Reference

| Component | Path |
|-----------|------|
| Main app | `backend/app/main.py` |
| Config | `backend/app/config.py` |
| Schemas | `backend/app/models/schemas.py` |
| Database | `backend/app/models/database.py` |
| Orchestrator | `backend/app/agents/orchestrator.py` |
| Graders | `backend/app/agents/graders/*.py` |
| OCR Service | `backend/app/services/ocr_service.py` |
| Triplet Service | `backend/app/services/triplet_service.py` |
| PDF Service | `backend/app/services/pdf_service.py` |
| Grading Service | `backend/app/services/grading_service.py` |
| Upload Routes | `backend/app/api/routes/upload.py` |
| Grade Routes | `backend/app/api/routes/grade.py` |
| Status Routes | `backend/app/api/routes/status.py` |
| Results Routes | `backend/app/api/routes/results.py` |
| Tests | `backend/tests/*.py` |
| Requirements | `backend/requirements.txt` |

---

## Contributing

1. Follow the coding guidelines in `CLAUDE.md`
2. Use async/await for all I/O operations
3. Add type hints to all function signatures
4. Use Pydantic models for request/response validation
5. Use structured logging with structlog
6. Write tests for new functionality

---

*Last updated: 2026-02-02*

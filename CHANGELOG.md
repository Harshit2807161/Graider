# Changelog

All notable changes to Gr8r will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added - 2026-01-31

#### Phase 1: Project Setup & Core Infrastructure

- **Backend Directory Structure**
  - Created `backend/app/` with full package structure
  - Created `backend/app/api/routes/` for API endpoints
  - Created `backend/app/services/` for business logic
  - Created `backend/app/agents/` for grading agents
  - Created `backend/app/models/` for Pydantic schemas
  - Created `backend/data/` for uploads and outputs
  - Created `backend/tests/` for test files

- **Configuration (`backend/app/config.py`)**
  - Pydantic Settings for environment variable management
  - Support for Claude models (Opus 4.5 orchestrator, Sonnet 4 graders)
  - Database, storage, CORS, and logging configuration

- **Pydantic Schemas (`backend/app/models/schemas.py`)**
  - `Question`, `Answer`, `RubricCriteria` for OCR output
  - `Triplet` for joined question-answer-rubric
  - `GradingResult` for grader output
  - `SessionStatus` for tracking progress
  - API request/response models (`UploadResponse`, `GradeRequest`, etc.)

- **SQLite Database (`backend/app/models/database.py`)**
  - Session management with CRUD operations
  - Results storage and retrieval
  - Progress tracking

- **FastAPI Application (`backend/app/main.py`)**
  - Application factory with lifespan management
  - CORS middleware configuration
  - Router includes for all endpoints
  - Health check endpoint

- **API Endpoints**
  - `POST /api/upload/questions` - Upload question paper images
  - `POST /api/upload/answers` - Upload answer sheet images
  - `POST /api/upload/rubric` - Upload rubric files
  - `POST /api/grade` - Trigger grading pipeline
  - `GET /api/status/{session_id}` - Check processing status
  - `GET /api/results/{session_id}` - Get grading results

- **OCR Service (`backend/app/services/ocr_service.py`)**
  - Claude Vision API integration for image-to-text
  - Question extraction with structured JSON output
  - Answer extraction with question matching
  - Rubric parsing (text and image support)

- **Triplet Service (`backend/app/services/triplet_service.py`)**
  - Question-answer-rubric joining logic
  - Subject detection (Math, English, Science)
  - Fuzzy ID matching for mismatched question numbers
  - JSON serialization/deserialization

- **Grading Pipeline (`backend/app/services/grading_service.py`)**
  - Full async pipeline: OCR → Triplets → Grading → Results
  - Progress tracking with database updates
  - Error handling with status updates

- **Orchestrator Agent (`backend/app/agents/orchestrator.py`)**
  - Claude Opus 4.5 for routing decisions
  - Subject-based grader selection
  - Result evaluation (placeholder for V1 re-grading)

- **Specialized Graders**
  - `MathGrader` - Mathematical accuracy, methodology, partial credit
  - `EnglishGrader` - Content, structure, grammar, literary analysis
  - `ScienceGrader` - Conceptual accuracy, terminology, reasoning
  - `HistoryGrader` - Historical accuracy, causation, evidence-based analysis
  - `BaseGrader` - Abstract base with common grading logic + feedback retry

- **LangGraph Orchestration (`backend/app/core/langgraph_setup.py`)**
  - `GradingState` TypedDict with full state tracking
  - `BatchGradingState` for processing multiple triplets
  - Memory checkpointing with `MemorySaver`
  - Helper functions for state initialization

- **LangGraph-based Orchestrator (`backend/app/agents/orchestrator.py`)**
  - Supervisor-worker pattern with StateGraph
  - `tag_triplet` node - Claude Opus 4.5 classifies subject + question type
  - `route_to_grader` node - Routes to specialized graders
  - `evaluate_result` node - Quality evaluation with acceptance/rejection
  - Feedback loop for rejected grades (max 3 attempts)
  - `finalize_result` node - Returns accepted grading

- **Question Type Tags Supported**
  - MCQ, Short Answer, Descriptive, Problem, Essay
  - Assertion-Reasoning, Differentiate, Elucidate

- **Subject Tags Supported**
  - Math, English, Science, History, General

- **Environment Configuration**
  - Created `backend/.env.example` with all configuration options
  - Created `backend/requirements.txt` with pip dependencies

### Infrastructure

- Created `harshit_mvp_dev` branch for development
- Set up conda environment `gr8r` with all dependencies
- Backend server tested and running on http://127.0.0.1:8000

### Testing

- Created `backend/tests/test_pipeline.py` for end-to-end testing
- Verified all API endpoints work correctly:
  - `POST /api/upload/questions` ✅
  - `POST /api/upload/answers` ✅
  - `POST /api/upload/rubric` ✅
  - `POST /api/grade` ✅
  - `GET /api/status/{session_id}` ✅
  - `GET /api/results/{session_id}` ✅
- Fixed background task error handling in grading pipeline

#### PDF & Mixed Document Support

- **PDF Processing Service (`backend/app/services/pdf_service.py`)**
  - PDF to image conversion using pdf2image
  - Text extraction from PDFs using pypdf
  - Support for multi-page PDFs
  - Graceful fallback when dependencies unavailable

- **Enhanced OCR Service**
  - Support for PDF input files (auto-converted to images)
  - New `extract_questions_and_answers()` method for combined documents
  - Improved prompts for mixed handwritten/printed text
  - Better handling of various question ID formats

- **Upload Endpoints Updated**
  - All endpoints now accept PDFs in addition to images
  - New `/api/upload/combined` endpoint for combined question+answer documents
  - Content-type detection with fallback to extension-based detection
  - Improved file validation

- **Grading Pipeline Updates**
  - Automatic detection of combined vs separate document uploads
  - Placeholder answers for unanswered questions
  - Better error messages for OCR failures

- **Test Client Updates**
  - Support for combined document mode (`--combined` flag)
  - Interactive mode with upload type selection
  - Better progress display and error handling

#### Phase 6: Documentation & Testing

- **README.md**
  - Comprehensive setup instructions with conda environment
  - Full API reference with request/response examples
  - Usage examples (test client, cURL, Python)
  - Rubric format documentation
  - Project structure overview
  - Configuration reference table
  - Supported question types and subjects

- **Test Suite (`backend/tests/`)**
  - `test_ocr.py` - OCR service tests with mocked Claude responses
  - `test_grading.py` - Grading agents and models tests
  - Tests for score boundary handling
  - Tests for feedback loop functionality
  - Tests for error handling in graders

- **Sample Fixtures**
  - `sample_rubric.txt` - Example rubric with Math, Science, English questions

---

## Future Releases

### [0.1.0] - MVP Target
- Complete OCR pipeline testing
- End-to-end grading workflow
- Basic frontend integration

### [0.2.0] - V1 Target
- User authentication
- Instructor/student portals
- AGNTCY observability integration
- Additional grader agents (History, MCQ, Reasoning)

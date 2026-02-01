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
  - `BaseGrader` - Abstract base with common grading logic

- **Environment Configuration**
  - Created `backend/.env.example` with all configuration options
  - Created `backend/requirements.txt` with pip dependencies

### Infrastructure

- Created `harshit_mvp_dev` branch for development
- Set up conda environment using `environment.yml`

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

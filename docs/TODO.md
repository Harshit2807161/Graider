# Gr8r MVP - Task List

## Overview
This is the implementation task list for Gr8r MVP. Tasks are organized by phase and priority.

---

## Phase 1: Project Setup & Core Infrastructure

### Environment & Configuration
- [ ] **1.1** Update `environment.yml` with new dependencies (FastAPI, LangGraph, AGNTCY, etc.)
- [ ] **1.2** Create `.claude/CLAUDE.md` with project-specific instructions
- [ ] **1.3** Create `.env.example` with required environment variables
- [ ] **1.4** Set up project directory structure (`backend/`, `frontend/`)

### Backend Skeleton
- [ ] **1.5** Create `backend/app/main.py` - FastAPI entry point
- [ ] **1.6** Create `backend/app/config.py` - Configuration management
- [ ] **1.7** Create `backend/app/models/schemas.py` - Pydantic models
- [ ] **1.8** Create `backend/app/models/database.py` - SQLite setup
- [ ] **1.9** Set up `backend/data/` directories (uploads, outputs)

### Frontend Skeleton
- [ ] **1.10** Initialize React + Vite project in `frontend/`
- [ ] **1.11** Install dependencies (axios, tailwindcss)
- [ ] **1.12** Create basic App.tsx structure

---

## Phase 2: OCR Pipeline

### File Upload
- [ ] **2.1** Create `backend/app/api/routes/upload.py` - Upload endpoints
- [ ] **2.2** Implement question paper upload (images)
- [ ] **2.3** Implement answer sheet upload (images)
- [ ] **2.4** Implement rubric upload (text + images)
- [ ] **2.5** Add file validation and storage

### Claude Vision OCR
- [ ] **2.6** Create `backend/app/services/ocr_service.py`
- [ ] **2.7** Implement question paper OCR → `questions.json`
- [ ] **2.8** Implement answer sheet OCR → `answers.json`
- [ ] **2.9** Implement rubric processing → `rubric.json`
- [ ] **2.10** Add OCR prompts for structured JSON output

### Triplet Formation
- [ ] **2.11** Create `backend/app/services/triplet_service.py`
- [ ] **2.12** Implement question-answer-rubric joining logic
- [ ] **2.13** Generate `triplets.json` output
- [ ] **2.14** Handle edge cases (missing questions, unmatched answers)

---

## Phase 3: Agent Orchestration

### LangGraph Setup
- [ ] **3.1** Create `backend/app/core/langgraph_setup.py`
- [ ] **3.2** Define `GradingState` TypedDict
- [ ] **3.3** Set up LangGraph graph structure
- [ ] **3.4** Configure checkpointing with MemorySaver

### Orchestrator Agent
- [ ] **3.5** Create `backend/app/agents/orchestrator.py`
- [ ] **3.6** Write `prompts/orchestrator.txt` system prompt
- [ ] **3.7** Implement subject tagging logic
- [ ] **3.8** Implement question type classification
- [ ] **3.9** Implement grader routing logic
- [ ] **3.10** Implement evaluation/feedback loop

### Specialized Graders
- [ ] **3.11** Create `backend/app/agents/graders/base_grader.py`
- [ ] **3.12** Create `backend/app/agents/graders/math_grader.py`
- [ ] **3.13** Create `backend/app/agents/graders/english_grader.py`
- [ ] **3.14** Create `backend/app/agents/graders/science_grader.py`
- [ ] **3.15** Write subject-specific system prompts
- [ ] **3.16** Implement grading logic with confidence scores

### AGNTCY Integration
- [ ] **3.17** Set up AGNTCY App SDK factory
- [ ] **3.18** Configure SLIM transport (if needed for MVP)
- [ ] **3.19** Integrate Observe SDK for tracing
- [ ] **3.20** Add `@agent` and `@graph` decorators

---

## Phase 4: API & Integration

### Grading Endpoints
- [ ] **4.1** Create `backend/app/api/routes/grade.py`
- [ ] **4.2** Implement POST `/api/grade` - Trigger grading
- [ ] **4.3** Implement async job processing
- [ ] **4.4** Create `backend/app/api/routes/status.py`
- [ ] **4.5** Implement GET `/api/status/{session_id}`

### Results Endpoints
- [ ] **4.6** Create `backend/app/api/routes/results.py`
- [ ] **4.7** Implement GET `/api/results/{session_id}`
- [ ] **4.8** Format results for frontend consumption

### Services Integration
- [ ] **4.9** Create `backend/app/services/grading_service.py`
- [ ] **4.10** Wire up OCR → Triplets → Agents pipeline
- [ ] **4.11** Create `backend/app/services/storage_service.py`
- [ ] **4.12** Implement SQLite session management

---

## Phase 5: Frontend

### Components
- [ ] **5.1** Create `frontend/src/components/FileUpload.tsx`
- [ ] **5.2** Create `frontend/src/components/ProcessingStatus.tsx`
- [ ] **5.3** Create `frontend/src/components/ResultsDashboard.tsx`
- [ ] **5.4** Create `frontend/src/components/QuestionResult.tsx`

### API Integration
- [ ] **5.5** Create `frontend/src/api/client.ts` - API client
- [ ] **5.6** Create `frontend/src/hooks/useGrading.ts` - Custom hook
- [ ] **5.7** Implement file upload with progress
- [ ] **5.8** Implement status polling
- [ ] **5.9** Implement results display

### UI/UX
- [ ] **5.10** Style components with Tailwind CSS
- [ ] **5.11** Add loading states and spinners
- [ ] **5.12** Add error handling and messages
- [ ] **5.13** Add success feedback

---

## Phase 6: Testing & Polish

### Testing
- [ ] **6.1** Create `backend/tests/test_ocr.py`
- [ ] **6.2** Create `backend/tests/test_grading.py`
- [ ] **6.3** Add sample fixtures (question papers, answer sheets)
- [ ] **6.4** Write integration tests for full pipeline
- [ ] **6.5** Add frontend tests (optional)

### Documentation
- [ ] **6.6** Update README.md with setup instructions
- [ ] **6.7** Document API endpoints
- [ ] **6.8** Add usage examples

### Polish
- [ ] **6.9** Error handling improvements
- [ ] **6.10** Performance optimization
- [ ] **6.11** Code cleanup and formatting
- [ ] **6.12** End-to-end testing with real documents

---

## Quick Reference

### Commands
```bash
# Activate environment
conda activate gr8r

# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev

# Run tests
cd backend && pytest
```

### Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_ORCHESTRATOR_MODEL=claude-opus-4-5-20250929
CLAUDE_GRADER_MODEL=claude-sonnet-4-20250514
```

---

## Progress Tracking (MVP)

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| 1. Setup | 12 | 0 | 0% |
| 2. OCR | 14 | 0 | 0% |
| 3. Agents | 20 | 0 | 0% |
| 4. API | 12 | 0 | 0% |
| 5. Frontend | 13 | 0 | 0% |
| 6. Testing | 12 | 0 | 0% |
| **MVP Total** | **83** | **0** | **0%** |

---

## Future Phases (V1 & V2)

### V1 Tasks (After MVP)
- [ ] **V1.1** Build instructor portal with dashboard
- [ ] **V1.2** Build student portal with results view
- [ ] **V1.3** Create landing page for website
- [ ] **V1.4** Implement user authentication (login/signup)
- [ ] **V1.5** Add role-based access (instructor vs student)
- [ ] **V1.6** Integrate AGNTCY Observe SDK for full tracing
- [ ] **V1.7** Implement History grader agent
- [ ] **V1.8** Implement MCQ specialist grader
- [ ] **V1.9** Implement Assertion-Reasoning grader
- [ ] **V1.10** Cost optimization (caching, batching)
- [ ] **V1.11** Latency optimization (parallel processing)
- [ ] **V1.12** Custom OCR training for handwriting improvement
- [ ] **V1.13** Session persistence and history
- [ ] **V1.14** Export results (CSV, PDF)
- [ ] **V1.15** Polish UI/UX across all portals

### V2 Tasks (After V1)
- [ ] **V2.1** Cloud hosting setup (AWS/GCP/Azure)
- [ ] **V2.2** Production database (PostgreSQL)
- [ ] **V2.3** CI/CD pipeline setup
- [ ] **V2.4** Monitoring and alerting (Grafana, Prometheus)
- [ ] **V2.5** Logging infrastructure (ELK/Loki)
- [ ] **V2.6** Auto-scaling configuration
- [ ] **V2.7** CDN for static assets
- [ ] **V2.8** Agent chain-of-thought UI component
- [ ] **V2.9** Real-time grading progress visualization
- [ ] **V2.10** Agent reasoning transparency in results
- [ ] **V2.11** Multi-tier cost optimization
- [ ] **V2.12** Disaster recovery and backups
- [ ] **V2.13** Security audit and hardening
- [ ] **V2.14** Load testing and performance tuning
- [ ] **V2.15** Documentation and user guides

---

*Last Updated: January 31, 2026*

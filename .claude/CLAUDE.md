# Gr8r - AI-Powered Grading System

## Project Overview
Gr8r is an AI-powered system that grades handwritten subjective answers using multi-agent orchestration. It uses Claude Vision for OCR and Claude-based agents for grading.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **OCR**: Claude Vision API (Anthropic)
- **Agent Orchestration**: LangGraph + AGNTCY Stack
- **Database**: SQLite (MVP) → PostgreSQL (V1)
- **Storage**: Local filesystem for uploads

### Frontend
- **Framework**: React 18+ with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios

### AI/ML
- **Orchestrator Model**: Claude Opus 4.5 (`claude-opus-4-5-20250929`)
- **Grader Models**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **OCR**: Claude Vision (via Messages API with images)

### Agent Infrastructure (AGNTCY)
- **App SDK**: `agntcy-app-sdk` - Factory for agent communication
- **Protocol**: A2A (Agent-to-Agent) over SLIM transport
- **Observability**: `ioa_observe_sdk` - OpenTelemetry tracing

## Project Structure

```
gr8r/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI endpoints
│   │   ├── services/            # Business logic
│   │   ├── agents/              # LangGraph agents
│   │   │   ├── orchestrator.py  # Main orchestrator (Opus 4.5)
│   │   │   └── graders/         # Specialized graders (Sonnet 4)
│   │   └── models/              # Pydantic schemas
│   └── data/                    # SQLite DB + uploads
├── frontend/
│   └── src/                     # React application
└── docs/                        # Documentation & research
```

## Key Patterns

### Two-Step Processing Pipeline
1. **OCR Step**: Claude Vision extracts text from images → structured JSON
2. **Grading Step**: LangGraph agents grade extracted text → scores + feedback

### Agent Architecture
- **Orchestrator**: Routes questions to subject graders, evaluates results
- **Math Grader**: Evaluates mathematical accuracy and methodology
- **English Grader**: Evaluates content, grammar, and structure
- **Science Grader**: Evaluates concepts and reasoning

### Data Flow
```
[Upload Images] → [Claude Vision OCR] → [Triplet Formation]
    → [Orchestrator] → [Specialized Graders] → [Results Dashboard]
```

## Development Commands

```bash
# Activate environment
conda activate gr8r

# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev

# Run tests
cd backend && pytest

# Format code
black backend/ && ruff check backend/
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional (defaults shown)
CLAUDE_ORCHESTRATOR_MODEL=claude-opus-4-5-20250929
CLAUDE_GRADER_MODEL=claude-sonnet-4-20250514
DATABASE_URL=sqlite:///./data/gr8r.db
UPLOAD_DIR=./data/uploads
```

## API Endpoints (MVP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload/questions | Upload question paper images |
| POST | /api/upload/answers | Upload answer sheet images |
| POST | /api/upload/rubric | Upload rubric (text/image) |
| POST | /api/grade | Trigger grading pipeline |
| GET | /api/status/{session_id} | Get processing status |
| GET | /api/results/{session_id} | Get grading results |

## Coding Guidelines

1. **Use async/await** for all I/O operations
2. **Type hints required** on all function signatures
3. **Pydantic models** for request/response validation
4. **Structured logging** with structlog
5. **Error handling** with custom exception classes

## Agent Prompt Files
System prompts are stored in `backend/app/agents/prompts/`:
- `orchestrator.txt` - Routing and evaluation logic
- `math.txt` - Math grading rubric
- `english.txt` - English grading rubric
- `science.txt` - Science grading rubric

## Testing
- Unit tests in `backend/tests/`
- Use fixtures for sample documents
- Mock Claude API calls in tests

## Key Documents
- [Implementation Plan](docs/plan.md)
- [Task List](docs/TODO.md)
- [EyePop Research](docs/eyepop_docs_overview.md)
- [AGNTCY Research](docs/agntcy_docs_overview.md)
- [Original Requirements](docs/start.txt)

## Version Roadmap

### MVP (Current)
- OCR ingestion using Claude Vision
- Basic pipeline setup (OCR → Triplets → Grading)
- API endpoints for testing
- AGNTCY-based orchestration
- Local data storage (SQLite + JSON)
- Local frontend without users, stateless
- 3 grader agents (Math, English, Science)

### V1 (Future)
- Instructor & student portals with polished UI
- Landing page for website
- Locally hosted end-to-end with working API
- Custom OCR training for improved accuracy
- Agent observability setup (AGNTCY Observe SDK)
- Cost and latency optimization
- User login system
- 5+ agents: Math, English, Science, History, MCQ, Reasoning specialists

### V2 (Future)
- Different input cost and latency optimizations
- Cloud hosting (AWS/GCP/Azure)
- Production backend infrastructure
- Proper DevOps (CI/CD, monitoring, logging)
- Agent chain-of-thought hooked to frontend for user transparency

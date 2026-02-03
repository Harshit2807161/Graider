# Gr8r - AI-Powered Grading System

Gr8r is an AI-powered system that grades handwritten subjective answers using multi-agent orchestration. It uses Claude Vision for OCR extraction and Claude-based specialized agents for grading.

**Brainstorm Doc**: [Google Doc](https://docs.google.com/document/d/1HY6bb-MtIK0mL4Hj4do01L7yVY33X0A_iQKQ2AfomOU/edit?tab=t.0#heading=h.rctywnz3nypk)

---

## Features

- **PDF & Image Support**: Process PDFs, images, or mixed document types
- **Claude Vision OCR**: Extract text from handwritten and printed documents
- **Combined Document Mode**: Handle worksheets with questions and answers together
- **Multi-Agent Grading**: Specialized graders for Math, English, Science, and History
- **LangGraph Orchestration**: Supervisor-worker pattern with feedback loops
- **Quality Evaluation**: Automatic re-grading for low-confidence results
- **Structured Feedback**: Detailed reasoning and improvement suggestions for students

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRADING PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Upload Images] → [Claude Vision OCR] → [Triplet Formation]   │
│                           ↓                                     │
│              ┌────────────────────────────┐                     │
│              │   ORCHESTRATOR (Opus 4.5)  │                     │
│              │   • Tag subject/type       │                     │
│              │   • Route to grader        │                     │
│              │   • Evaluate results       │                     │
│              └────────────┬───────────────┘                     │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         ↓                 ↓                 ↓                   │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│   │   Math   │     │ English  │     │ Science  │               │
│   │  Grader  │     │  Grader  │     │  Grader  │               │
│   │(Sonnet 4)│     │(Sonnet 4)│     │(Sonnet 4)│               │
│   └──────────┘     └──────────┘     └──────────┘               │
│                           │                                     │
│                           ↓                                     │
│              ┌────────────────────────────┐                     │
│              │   EVALUATOR + FEEDBACK     │                     │
│              │   (Retry if confidence<0.7)│                     │
│              └────────────────────────────┘                     │
│                           │                                     │
│                           ↓                                     │
│                    [RESULTS JSON]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Create Conda Environment

```bash
# Create environment with Python 3.12
conda create -n gr8r python=3.12 -y

# Activate the environment
conda activate gr8r

# Install conda packages
conda install -c conda-forge pip=25.3 numpy pandas pillow sqlite pytest black ruff -y

# Install pip packages
pip install fastapi>=0.115.0 \
    uvicorn[standard]>=0.34.0 \
    python-multipart \
    pydantic>=2.10.0 \
    pydantic-settings>=2.7.0 \
    anthropic>=0.45.0 \
    langchain>=0.3.0 \
    langchain-anthropic>=0.3.0 \
    langchain-core>=0.3.0 \
    langgraph>=0.4.0 \
    pypdf>=5.0.0 \
    pdf2image \
    httpx>=0.28.0 \
    aiofiles \
    python-dotenv>=1.0.0 \
    tenacity \
    structlog
```

### 2. Install PDF Support (Optional)

For PDF processing, install poppler:

```bash
# Windows (using chocolatey)
choco install poppler

# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils
```

### 3. Configure Environment Variables

Create `backend/.env` file:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional (defaults shown)
CLAUDE_ORCHESTRATOR_MODEL=claude-opus-4-5-20250929
CLAUDE_GRADER_MODEL=claude-sonnet-4-20250514
DATABASE_URL=sqlite:///./data/gr8r.db
UPLOAD_DIR=./data/uploads
```

### 4. Start the Backend Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Server will be available at:
- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

---

## API Reference

### Upload Endpoints

#### POST `/api/upload/questions`
Upload question paper files.

**Request**: `multipart/form-data`
- `files`: One or more files (PNG, JPG, GIF, WebP, or PDF)

**Response**:
```json
{
  "session_id": "abc123",
  "message": "Uploaded 2 question paper file(s)",
  "file_count": 2
}
```

#### POST `/api/upload/answers`
Upload answer sheet files.

**Request**: `multipart/form-data`
- `files`: One or more files (PNG, JPG, GIF, WebP, or PDF)
- `session_id`: Session ID from question upload

**Response**:
```json
{
  "session_id": "abc123",
  "message": "Uploaded 3 answer sheet file(s)",
  "file_count": 3
}
```

#### POST `/api/upload/combined`
Upload combined documents containing BOTH questions AND answers.

Use this when your document has questions printed with answers written below them,
or a single PDF containing both question paper and answer sheets.

**Request**: `multipart/form-data`
- `files`: One or more files (PNG, JPG, GIF, WebP, or PDF)

**Response**:
```json
{
  "session_id": "abc123",
  "message": "Successfully uploaded 1 combined file(s). Questions and answers will be extracted together.",
  "file_count": 1
}
```

#### POST `/api/upload/rubric`
Upload rubric file(s).

**Request**: `multipart/form-data`
- `files`: Text file (.txt) or image file
- `session_id`: Session ID from question upload

**Response**:
```json
{
  "session_id": "abc123",
  "message": "Uploaded 1 rubric file(s)",
  "file_count": 1
}
```

### Grading Endpoints

#### POST `/api/grade`
Trigger the grading pipeline.

**Request**:
```json
{
  "session_id": "abc123"
}
```

**Response**:
```json
{
  "session_id": "abc123",
  "status": "processing",
  "message": "Grading pipeline started"
}
```

#### GET `/api/status/{session_id}`
Check processing status.

**Response**:
```json
{
  "session_id": "abc123",
  "status": "processing",
  "progress": 45.5,
  "current_step": "Grading question 3 of 5"
}
```

Status values: `pending`, `processing`, `completed`, `failed`

#### GET `/api/results/{session_id}`
Get grading results.

**Response**:
```json
{
  "session_id": "abc123",
  "results": [
    {
      "question_id": "Q1",
      "score": 8,
      "max_score": 10,
      "percentage": 80.0,
      "reasoning": "Student correctly explained the main concepts...",
      "feedback": "Good understanding. Consider adding more examples...",
      "grader": "science_grader",
      "confidence": 0.92
    }
  ],
  "total_score": 23,
  "max_total_score": 30,
  "overall_percentage": 76.7,
  "summary": "Overall good performance with strong science understanding."
}
```

---

## Usage Examples

### Using the Test Client

```bash
cd backend

# Interactive mode
python test_client.py

# Separate question and answer files (images or PDFs)
python test_client.py \
    --questions ./samples/questions.pdf \
    --answers ./samples/answers.pdf \
    --rubric ./samples/rubric.txt

# Combined document (questions + answers in same file)
python test_client.py \
    --combined ./samples/worksheet.pdf \
    --rubric ./samples/rubric.txt

# Multiple files with glob patterns
python test_client.py \
    -q "./questions/*.png" \
    -a "./answers/*.jpg" \
    -r rubric.pdf
```

### Using cURL

```bash
# 1. Upload question papers
curl -X POST "http://127.0.0.1:8000/api/upload/questions" \
  -F "files=@question_paper.png"

# Response: {"session_id": "abc123", ...}

# 2. Upload answer sheets
curl -X POST "http://127.0.0.1:8000/api/upload/answers" \
  -F "files=@answer_sheet.png" \
  -F "session_id=abc123"

# 3. Upload rubric
curl -X POST "http://127.0.0.1:8000/api/upload/rubric" \
  -F "files=@rubric.txt" \
  -F "session_id=abc123"

# 4. Trigger grading
curl -X POST "http://127.0.0.1:8000/api/grade" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123"}'

# 5. Poll for status
curl "http://127.0.0.1:8000/api/status/abc123"

# 6. Get results
curl "http://127.0.0.1:8000/api/results/abc123"
```

### Using Python

```python
import httpx
import asyncio

async def grade_papers():
    async with httpx.AsyncClient() as client:
        base_url = "http://127.0.0.1:8000"

        # Upload question papers
        with open("question_paper.png", "rb") as f:
            resp = await client.post(
                f"{base_url}/api/upload/questions",
                files={"files": f}
            )
        session_id = resp.json()["session_id"]

        # Upload answer sheets
        with open("answer_sheet.png", "rb") as f:
            await client.post(
                f"{base_url}/api/upload/answers",
                files={"files": f},
                data={"session_id": session_id}
            )

        # Upload rubric
        with open("rubric.txt", "rb") as f:
            await client.post(
                f"{base_url}/api/upload/rubric",
                files={"files": f},
                data={"session_id": session_id}
            )

        # Trigger grading
        await client.post(
            f"{base_url}/api/grade",
            json={"session_id": session_id}
        )

        # Poll for completion
        while True:
            resp = await client.get(f"{base_url}/api/status/{session_id}")
            status = resp.json()["status"]
            if status == "completed":
                break
            elif status == "failed":
                raise Exception("Grading failed")
            await asyncio.sleep(5)

        # Get results
        resp = await client.get(f"{base_url}/api/results/{session_id}")
        return resp.json()

# Run
results = asyncio.run(grade_papers())
print(f"Total: {results['total_score']}/{results['max_total_score']}")
```

---

## Rubric Format

Create a text file with the following structure:

```markdown
## Question 1: Mathematics (5 marks)
**Question**: Solve for x: 2x + 5 = 15

**Expected Answer**: x = 5

**Scoring**:
- Full marks (5): Correct answer with work shown
- Partial (3): Correct method but calculation error
- Minimal (1): Some attempt at solving

**Key Steps**:
- Subtract 5 from both sides: 2x = 10
- Divide by 2: x = 5

---

## Question 2: Science (10 marks)
**Question**: Explain the process of photosynthesis.

**Expected Points**:
- Light absorption by chlorophyll
- Water and CO2 as inputs
- Glucose and O2 as outputs
- Location in chloroplasts

**Scoring**:
- Full marks (10): All key points covered
- Partial (6-7): Most points covered
- Minimal (2-3): Basic understanding shown
```

---

## Project Structure

```
backend/
├── app/
│   ├── api/routes/         # API endpoints
│   │   ├── upload.py       # File upload
│   │   ├── grade.py        # Grading trigger
│   │   ├── status.py       # Status polling
│   │   └── results.py      # Results retrieval
│   ├── services/           # Business logic
│   │   ├── ocr_service.py  # Claude Vision OCR
│   │   ├── triplet_service.py
│   │   └── grading_service.py
│   ├── agents/             # LangGraph agents
│   │   ├── orchestrator.py # Main supervisor
│   │   └── graders/        # Specialized graders
│   │       ├── base_grader.py
│   │       ├── math_grader.py
│   │       ├── english_grader.py
│   │       ├── science_grader.py
│   │       └── history_grader.py
│   ├── models/             # Pydantic schemas
│   └── core/               # LangGraph setup
├── data/                   # SQLite DB + uploads
└── tests/                  # Test files
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `CLAUDE_ORCHESTRATOR_MODEL` | `claude-opus-4-5-20250929` | Model for orchestrator |
| `CLAUDE_GRADER_MODEL` | `claude-sonnet-4-20250514` | Model for graders |
| `DATABASE_URL` | `sqlite:///./data/gr8r.db` | Database connection |
| `UPLOAD_DIR` | `./data/uploads` | Upload directory |
| `MAX_GRADING_RETRIES` | `3` | Max feedback loop retries |

---

## Development

```bash
# Run tests
cd backend && pytest

# Format code
black backend/
ruff check backend/

# Check types
mypy backend/
```

---

## Supported Question Types

- **MCQ** - Multiple choice questions
- **Short Answer** - Brief responses
- **Descriptive** - Detailed explanations
- **Problem** - Mathematical/scientific problems
- **Essay** - Extended written responses
- **Assertion-Reasoning** - A-R type questions
- **Differentiate** - Compare and contrast
- **Elucidate** - Explain in detail

---

## Supported Subjects

- Mathematics
- English
- Science
- History
- General (fallback)

---

## License

MIT License - See LICENSE file for details.

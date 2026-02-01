# Gr8r - System Flow Diagrams

## Overview
This document describes the complete system flow for the Gr8r grading system, from input to output.

---

## 1. End-to-End System Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           GR8R END-TO-END SYSTEM FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   USER      │
                                    │ (Instructor)│
                                    └──────┬──────┘
                                           │
                    ╔══════════════════════╧══════════════════════╗
                    ║           STEP 1: FILE UPLOAD               ║
                    ╚══════════════════════╤══════════════════════╝
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │  Question Paper │          │  Answer Sheets  │          │     Rubric      │
    │   (Images/PDF)  │          │   (Images/PDF)  │          │  (Text/Image)   │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             ▼                            ▼                            ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │    Validate     │          │    Validate     │          │    Validate     │
    │  • Format       │          │  • Format       │          │  • Format       │
    │  • Size < 50MB  │          │  • Size < 50MB  │          │  • Size < 50MB  │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             ▼                            ▼                            ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │     Store       │          │     Store       │          │     Store       │
    │   /uploads/     │          │   /uploads/     │          │   /uploads/     │
    │  session_id/    │          │  session_id/    │          │  session_id/    │
    │   questions/    │          │    answers/     │          │    rubric/      │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          │
                    ╔═════════════════════╧═════════════════════╗
                    ║           STEP 2: OCR PROCESSING          ║
                    ║           (Claude Vision API)             ║
                    ╚═════════════════════╤═════════════════════╝
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
    │  OCR: Questions     │     │  OCR: Answers       │     │  Process: Rubric    │
    │                     │     │                     │     │                     │
    │  Prompt:            │     │  Prompt:            │     │  Prompt:            │
    │  "Extract all       │     │  "Extract student   │     │  "Parse grading     │
    │   questions with    │     │   answers, match    │     │   criteria, key     │
    │   numbers, marks,   │     │   to question IDs"  │     │   points, scoring"  │
    │   type..."          │     │                     │     │                     │
    └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
               │                           │                           │
               ▼                           ▼                           ▼
    ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
    │   questions.json    │     │    answers.json     │     │    rubric.json      │
    │                     │     │                     │     │                     │
    │  {                  │     │  {                  │     │  {                  │
    │    "questions": [   │     │    "answers": [     │     │    "criteria": {    │
    │      {              │     │      {              │     │      "Q1": {        │
    │        "id": "Q1",  │     │        "q_id":"Q1", │     │        "points":[],│
    │        "text":"...",│     │        "text":"..." │     │        "sample":"" │
    │        "max": 10    │     │      }              │     │      }              │
    │      }              │     │    ]                │     │    }                │
    │    ]                │     │  }                  │     │  }                  │
    │  }                  │     │                     │     │                     │
    └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
               │                           │                           │
               └───────────────────────────┼───────────────────────────┘
                                           │
                    ╔══════════════════════╧══════════════════════╗
                    ║        STEP 3: TRIPLET FORMATION            ║
                    ╚══════════════════════╤══════════════════════╝
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │    triplet_service.py   │
                              │                         │
                              │  join(questions,        │
                              │       answers,          │
                              │       rubric)           │
                              │                         │
                              │  match on question_id   │
                              └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │     triplets.json       │
                              │                         │
                              │  [                      │
                              │    {                    │
                              │      "question_id":"Q1",│
                              │      "question": "...", │
                              │      "answer": "...",   │
                              │      "rubric": {...},   │
                              │      "max_score": 10    │
                              │    },                   │
                              │    ...                  │
                              │  ]                      │
                              └────────────┬────────────┘
                                           │
                    ╔══════════════════════╧══════════════════════╗
                    ║        STEP 4: AGENT ORCHESTRATION          ║
                    ║           (LangGraph + AGNTCY)              ║
                    ╚══════════════════════╤══════════════════════╝
                                           │
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                  │
    │   ┌─────────────────────────────────────────────────────────────────────────┐   │
    │   │                    ORCHESTRATOR (Claude Opus 4.5)                        │   │
    │   │                                                                          │   │
    │   │   For each triplet:                                                     │   │
    │   │                                                                          │   │
    │   │   1. ANALYZE ────────────────────────────────────────────────────────   │   │
    │   │      │ Determine subject: math | english | science | history           │   │
    │   │      │ Determine type: MCQ | descriptive | problem | reasoning         │   │
    │   │      ▼                                                                   │   │
    │   │   2. ROUTE ──────────────────────────────────────────────────────────   │   │
    │   │      │ Select appropriate grader agent                                  │   │
    │   │      │ Pass triplet + grading instructions                             │   │
    │   │      ▼                                                                   │   │
    │   └──────┼──────────────────────────────────────────────────────────────────┘   │
    │          │                                                                       │
    │          │              ┌───────────────────────────────────────┐               │
    │          │              │         SPECIALIZED GRADERS           │               │
    │          │              │        (Claude Sonnet 4)              │               │
    │          │              └───────────────────────────────────────┘               │
    │          │                                                                       │
    │          ├─────────────────────┬─────────────────────┬──────────────────────┐   │
    │          ▼                     ▼                     ▼                      │   │
    │   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │   │
    │   │ MATH GRADER │       │ENG GRADER   │       │ SCI GRADER  │              │   │
    │   │             │       │             │       │             │              │   │
    │   │ Rubric:     │       │ Rubric:     │       │ Rubric:     │              │   │
    │   │ • Accuracy  │       │ • Content   │       │ • Concepts  │              │   │
    │   │   (40%)     │       │   (35%)     │       │   (40%)     │              │   │
    │   │ • Method    │       │ • Grammar   │       │ • Accuracy  │              │   │
    │   │   (30%)     │       │   (25%)     │       │   (30%)     │              │   │
    │   │ • Clarity   │       │ • Structure │       │ • Reasoning │              │   │
    │   │   (30%)     │       │   (40%)     │       │   (30%)     │              │   │
    │   └──────┬──────┘       └──────┬──────┘       └──────┬──────┘              │   │
    │          │                     │                     │                      │   │
    │          └─────────────────────┼─────────────────────┘                      │   │
    │                                │                                             │   │
    │                                ▼                                             │   │
    │   ┌─────────────────────────────────────────────────────────────────────┐   │
    │   │                           EVALUATOR                                  │   │
    │   │                                                                      │   │
    │   │   3. EVALUATE ───────────────────────────────────────────────────   │   │
    │   │      │ Check confidence score                                        │   │
    │   │      │                                                               │   │
    │   │      ├─── confidence >= 0.8 ──▶ APPROVE                             │   │
    │   │      │                                                               │   │
    │   │      └─── confidence < 0.8  ──▶ FEEDBACK LOOP                       │   │
    │   │                                   │                                  │   │
    │   │                                   ▼                                  │   │
    │   │                          ┌───────────────┐                          │   │
    │   │                          │   Re-grade    │                          │   │
    │   │                          │ with feedback │ ◀──┐                     │   │
    │   │                          └───────┬───────┘    │                     │   │
    │   │                                  │            │                     │   │
    │   │                                  ▼            │                     │   │
    │   │                          [Still low?] ───YES──┘ (max 3 attempts)   │   │
    │   │                                  │                                  │   │
    │   │                                 NO                                  │   │
    │   │                                  │                                  │   │
    │   │                                  ▼                                  │   │
    │   │   4. AGGREGATE ──────────────────────────────────────────────────   │   │
    │   │      │ Collect all approved grades                                  │   │
    │   │      │ Calculate total score                                        │   │
    │   │      │ Compile feedback                                             │   │
    │   │      ▼                                                               │   │
    │   └──────────────────────────────────────────────────────────────────────┘   │
    │                                                                                  │
    └──────────────────────────────────────────┬───────────────────────────────────────┘
                                               │
                    ╔══════════════════════════╧══════════════════════╗
                    ║          STEP 5: STORE RESULTS                  ║
                    ╚══════════════════════════╤══════════════════════╝
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │    grading_results.json     │
                              │                             │
                              │  {                          │
                              │    "session_id": "abc123",  │
                              │    "total_score": 23,       │
                              │    "max_score": 30,         │
                              │    "percentage": 76.7,      │
                              │    "results": [             │
                              │      {                      │
                              │        "question_id": "Q1", │
                              │        "score": 8,          │
                              │        "max_score": 10,     │
                              │        "grader": "science", │
                              │        "confidence": 0.92,  │
                              │        "reasoning": "...",  │
                              │        "feedback": "..."    │
                              │      },                     │
                              │      ...                    │
                              │    ]                        │
                              │  }                          │
                              └──────────────┬──────────────┘
                                             │
                    ╔════════════════════════╧════════════════════════╗
                    ║          STEP 6: DISPLAY RESULTS                ║
                    ╚════════════════════════╤════════════════════════╝
                                             │
                                             ▼
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                              RESULTS DASHBOARD                                   │
    │                                                                                  │
    │   ┌─────────────────────────────────────────────────────────────────────────┐   │
    │   │                                                                          │   │
    │   │   Session: abc123                    Total: 23/30 (76.7%)               │   │
    │   │                                                                          │   │
    │   │   ════════════════════════════════════════════════════════════════════  │   │
    │   │                                                                          │   │
    │   │   Q1 (Science) ████████░░ 8/10                                          │   │
    │   │   ├─ Reasoning: Student correctly identified the main concepts of       │   │
    │   │   │             photosynthesis, including light absorption and           │   │
    │   │   │             glucose production.                                      │   │
    │   │   └─ Feedback:  Good understanding shown. To improve, include more      │   │
    │   │                 detail about the role of chloroplasts and ATP.          │   │
    │   │                                                                          │   │
    │   │   Q2 (Math)    ██████████ 5/5                                           │   │
    │   │   ├─ Reasoning: Correct solution with all steps properly shown.          │   │
    │   │   └─ Feedback:  Excellent work! Clear methodology and accurate           │   │
    │   │                 calculation.                                             │   │
    │   │                                                                          │   │
    │   │   Q3 (English) ██████████ 10/15                                         │   │
    │   │   ├─ Reasoning: Good argument structure but lacks supporting evidence   │   │
    │   │   │             in the second paragraph.                                 │   │
    │   │   └─ Feedback:  Consider adding more quotes and examples to strengthen  │   │
    │   │                 your argument. Grammar is solid overall.                 │   │
    │   │                                                                          │   │
    │   └─────────────────────────────────────────────────────────────────────────┘   │
    │                                                                                  │
    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                            │
    │   │ Export CSV  │  │ Export PDF  │  │ New Session │                            │
    │   └─────────────┘  └─────────────┘  └─────────────┘                            │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. OCR Processing Detail Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              OCR PROCESSING FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

INPUT: Image file (JPG/PNG) or PDF
                │
                ▼
    ┌─────────────────────────────────────────┐
    │           1. LOAD IMAGE                  │
    │                                          │
    │   • Read file from /uploads/             │
    │   • Convert PDF pages to images          │
    │   • Resize if > 2000px                   │
    │   • Convert to base64                    │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │        2. PREPARE API REQUEST            │
    │                                          │
    │   messages = [                           │
    │     {                                    │
    │       "role": "user",                    │
    │       "content": [                       │
    │         {                                │
    │           "type": "image",               │
    │           "source": {                    │
    │             "type": "base64",            │
    │             "data": "<image_data>"       │
    │           }                              │
    │         },                               │
    │         {                                │
    │           "type": "text",                │
    │           "text": "<OCR_PROMPT>"         │
    │         }                                │
    │       ]                                  │
    │     }                                    │
    │   ]                                      │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │        3. CALL CLAUDE VISION API         │
    │                                          │
    │   Model: claude-sonnet-4-20250514        │
    │   Max tokens: 4096                       │
    │   Temperature: 0 (deterministic)         │
    │                                          │
    │   ┌───────────────────────────────────┐ │
    │   │         OCR PROMPTS               │ │
    │   ├───────────────────────────────────┤ │
    │   │ Questions:                        │ │
    │   │ "Extract all questions from this  │ │
    │   │  exam paper. For each question:   │ │
    │   │  - Question number/ID             │ │
    │   │  - Full question text             │ │
    │   │  - Maximum marks                  │ │
    │   │  - Question type (if identifiable)│ │
    │   │  Return as JSON array."           │ │
    │   ├───────────────────────────────────┤ │
    │   │ Answers:                          │ │
    │   │ "Extract handwritten answers from │ │
    │   │  this answer sheet. For each:     │ │
    │   │  - Question ID it answers         │ │
    │   │  - Full transcribed answer        │ │
    │   │  - Any diagrams described         │ │
    │   │  Return as JSON array."           │ │
    │   ├───────────────────────────────────┤ │
    │   │ Rubric:                           │ │
    │   │ "Parse this grading rubric. For   │ │
    │   │  each question extract:           │ │
    │   │  - Key points expected            │ │
    │   │  - Sample answer if provided      │ │
    │   │  - Scoring breakdown              │ │
    │   │  Return as JSON object."          │ │
    │   └───────────────────────────────────┘ │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │        4. PARSE RESPONSE                 │
    │                                          │
    │   • Extract JSON from response           │
    │   • Validate structure                   │
    │   • Handle parsing errors                │
    │   • Apply confidence filtering           │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │        5. SAVE OUTPUT                    │
    │                                          │
    │   • Write to /outputs/session_id/        │
    │   • questions.json                       │
    │   • answers.json                         │
    │   • rubric.json                          │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
                    OUTPUT
```

---

## 3. Agent Grading Flow Detail

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AGENT GRADING FLOW DETAIL                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

INPUT: Single triplet from triplets.json
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATOR NODE                                     │
│                           (Claude Opus 4.5)                                        │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   State: {                                                                        │
│     question_id: "Q1",                                                            │
│     question_text: "Explain the process of photosynthesis...",                    │
│     candidate_answer: "Photosynthesis is when plants...",                         │
│     rubric: { key_points: [...], sample: "..." },                                │
│     max_score: 10,                                                                │
│     subject_tag: null,      ◀── To be determined                                 │
│     type_tag: null,         ◀── To be determined                                 │
│     assigned_grader: null   ◀── To be determined                                 │
│   }                                                                               │
│                                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────────┐ │
│   │                        ANALYSIS PROMPT                                       │ │
│   │                                                                              │ │
│   │   "Analyze this question and determine:                                     │ │
│   │    1. Subject area: math | english | science | history | general           │ │
│   │    2. Question type: MCQ | descriptive | problem | reasoning | compare     │ │
│   │                                                                              │ │
│   │    Question: {question_text}                                                │ │
│   │                                                                              │ │
│   │    Return JSON: { subject: '...', type: '...' }"                           │ │
│   └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│   Result: { subject: "science", type: "descriptive" }                             │
│                                                                                    │
│   → Route to: science_grader                                                      │
│                                                                                    │
└───────────────────────────────────────────────────┬───────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              SCIENCE GRADER NODE                                   │
│                           (Claude Sonnet 4)                                        │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────────┐ │
│   │                        GRADING SYSTEM PROMPT                                 │ │
│   │                                                                              │ │
│   │   "You are a Science Grading Agent. Grade the student's answer based on:   │ │
│   │                                                                              │ │
│   │   RUBRIC:                                                                    │ │
│   │   - Conceptual Understanding (40%): Correct scientific concepts             │ │
│   │   - Application (30%): Proper application of principles                     │ │
│   │   - Factual Accuracy (20%): Correct facts, units, terminology               │ │
│   │   - Scientific Reasoning (10%): Logical deductions and conclusions          │ │
│   │                                                                              │ │
│   │   GRADING GUIDELINES:                                                        │ │
│   │   - Be fair but rigorous                                                     │ │
│   │   - Award partial credit for correct approach                               │ │
│   │   - Cite specific parts of the answer in reasoning                          │ │
│   │   - Provide constructive feedback for improvement                           │ │
│   │                                                                              │ │
│   │   Return JSON: {                                                             │ │
│   │     score: <number>,                                                         │ │
│   │     max_score: <number>,                                                     │ │
│   │     confidence: <0-1>,                                                       │ │
│   │     reasoning: '<detailed explanation>',                                     │ │
│   │     feedback: '<student-facing feedback>',                                   │ │
│   │     rubric_breakdown: {                                                      │ │
│   │       concepts: <score>,                                                     │ │
│   │       application: <score>,                                                  │ │
│   │       accuracy: <score>,                                                     │ │
│   │       reasoning: <score>                                                     │ │
│   │     }                                                                        │ │
│   │   }"                                                                         │ │
│   └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────────┐ │
│   │                        GRADING USER PROMPT                                   │ │
│   │                                                                              │ │
│   │   "Grade this answer:                                                        │ │
│   │                                                                              │ │
│   │    QUESTION: {question_text}                                                │ │
│   │    MAX SCORE: {max_score}                                                   │ │
│   │                                                                              │ │
│   │    STUDENT ANSWER:                                                           │ │
│   │    {candidate_answer}                                                        │ │
│   │                                                                              │ │
│   │    EXPECTED KEY POINTS:                                                      │ │
│   │    {rubric.key_points}                                                       │ │
│   │                                                                              │ │
│   │    SAMPLE ANSWER (if available):                                            │ │
│   │    {rubric.sample}"                                                          │ │
│   └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│   Result: {                                                                        │
│     score: 8,                                                                      │
│     max_score: 10,                                                                 │
│     confidence: 0.92,                                                              │
│     reasoning: "Student correctly identified light absorption and glucose          │
│                 production. Missing chlorophyll role details.",                    │
│     feedback: "Good understanding. Add more about chloroplasts.",                 │
│     rubric_breakdown: { concepts: 3.5, application: 2.5, accuracy: 1.5, ... }    │
│   }                                                                                │
│                                                                                    │
└───────────────────────────────────────────────────┬───────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              EVALUATOR NODE                                        │
│                           (in Orchestrator)                                        │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   Input: grading_result from science_grader                                       │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐  │
│   │                     CONFIDENCE CHECK                                        │  │
│   │                                                                             │  │
│   │   if result.confidence >= 0.8:                                             │  │
│   │       → APPROVE grade                                                       │  │
│   │       → Add to final results                                               │  │
│   │                                                                             │  │
│   │   elif result.attempts < 3:                                                │  │
│   │       → Generate feedback for grader                                       │  │
│   │       → RE-GRADE with additional guidance                                  │  │
│   │                                                                             │  │
│   │   else:                                                                     │  │
│   │       → APPROVE with low-confidence flag                                   │  │
│   │       → Log for manual review                                              │  │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
│   This case: confidence = 0.92 >= 0.8 → APPROVED                                  │
│                                                                                    │
└───────────────────────────────────────────────────┬───────────────────────────────┘
                                                    │
                                                    ▼
                                              NEXT TRIPLET
                                           (or END if last)
```

---

## 4. API Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              API REQUEST/RESPONSE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

ENDPOINT: POST /api/upload/questions
═══════════════════════════════════

Request:
    ┌────────────────────────────────────────┐
    │ POST /api/upload/questions              │
    │ Content-Type: multipart/form-data       │
    │                                         │
    │ file: <binary image data>               │
    │ session_id: "abc123" (optional)         │
    └────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │          FastAPI Handler                │
    │                                         │
    │  1. Validate file type                  │
    │  2. Validate file size                  │
    │  3. Generate session_id if not provided │
    │  4. Save to /uploads/session_id/        │
    └────────────────────────────────────────┘
              │
              ▼
Response:
    ┌────────────────────────────────────────┐
    │ 200 OK                                  │
    │ Content-Type: application/json          │
    │                                         │
    │ {                                       │
    │   "success": true,                      │
    │   "session_id": "abc123",               │
    │   "file_type": "questions",             │
    │   "filename": "exam_paper.jpg",         │
    │   "size_bytes": 1234567                 │
    │ }                                       │
    └────────────────────────────────────────┘


ENDPOINT: POST /api/grade
═════════════════════════

Request:
    ┌────────────────────────────────────────┐
    │ POST /api/grade                         │
    │ Content-Type: application/json          │
    │                                         │
    │ {                                       │
    │   "session_id": "abc123"                │
    │ }                                       │
    └────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │          FastAPI Handler                │
    │                                         │
    │  1. Validate session has all files      │
    │  2. Create background job               │
    │  3. Start grading pipeline async        │
    │  4. Return job ID immediately           │
    └────────────────────────────────────────┘
              │
              ▼
Response:
    ┌────────────────────────────────────────┐
    │ 202 Accepted                            │
    │ Content-Type: application/json          │
    │                                         │
    │ {                                       │
    │   "success": true,                      │
    │   "session_id": "abc123",               │
    │   "status": "processing",               │
    │   "message": "Grading started"          │
    │ }                                       │
    └────────────────────────────────────────┘


ENDPOINT: GET /api/status/{session_id}
══════════════════════════════════════

Request:
    ┌────────────────────────────────────────┐
    │ GET /api/status/abc123                  │
    └────────────────────────────────────────┘
              │
              ▼
Response (in progress):
    ┌────────────────────────────────────────┐
    │ 200 OK                                  │
    │                                         │
    │ {                                       │
    │   "session_id": "abc123",               │
    │   "status": "processing",               │
    │   "progress": 65,                       │
    │   "current_step": "grading_q2",         │
    │   "steps_completed": [                  │
    │     "ocr_questions",                    │
    │     "ocr_answers",                      │
    │     "ocr_rubric",                       │
    │     "triplet_formation",                │
    │     "grading_q1"                        │
    │   ],                                    │
    │   "estimated_remaining": 15             │
    │ }                                       │
    └────────────────────────────────────────┘

Response (completed):
    ┌────────────────────────────────────────┐
    │ 200 OK                                  │
    │                                         │
    │ {                                       │
    │   "session_id": "abc123",               │
    │   "status": "completed",                │
    │   "progress": 100,                      │
    │   "results_url": "/api/results/abc123"  │
    │ }                                       │
    └────────────────────────────────────────┘


ENDPOINT: GET /api/results/{session_id}
═══════════════════════════════════════

Request:
    ┌────────────────────────────────────────┐
    │ GET /api/results/abc123                 │
    └────────────────────────────────────────┘
              │
              ▼
Response:
    ┌────────────────────────────────────────┐
    │ 200 OK                                  │
    │                                         │
    │ {                                       │
    │   "session_id": "abc123",               │
    │   "status": "completed",                │
    │   "graded_at": "2026-01-31T12:34:56Z",  │
    │   "summary": {                          │
    │     "total_score": 23,                  │
    │     "max_score": 30,                    │
    │     "percentage": 76.7,                 │
    │     "questions_graded": 3               │
    │   },                                    │
    │   "results": [                          │
    │     {                                   │
    │       "question_id": "Q1",              │
    │       "question_text": "Explain...",    │
    │       "score": 8,                       │
    │       "max_score": 10,                  │
    │       "grader": "science_grader",       │
    │       "subject": "science",             │
    │       "confidence": 0.92,               │
    │       "reasoning": "Student correctly...",│
    │       "feedback": "Good understanding..." │
    │     },                                  │
    │     ...                                 │
    │   ]                                     │
    │ }                                       │
    └────────────────────────────────────────┘
```

---

## 5. Error Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   ERROR FLOWS                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Invalid File Upload
═══════════════════════════════

    ┌─────────────┐
    │ User uploads│
    │ invalid file│
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────┐
    │ Validate file type  │
    │ Allowed: jpg, png,  │
    │          pdf, txt   │
    └──────────┬──────────┘
               │
        [type = .exe]
               │
               ▼
    ┌─────────────────────┐
    │ 400 Bad Request     │
    │                     │
    │ {                   │
    │   "error": true,    │
    │   "code": "INVALID_ │
    │           FORMAT",  │
    │   "message": "File  │
    │     type .exe not   │
    │     allowed"        │
    │ }                   │
    └─────────────────────┘


SCENARIO 2: OCR Failure
═══════════════════════

    ┌─────────────┐
    │ OCR Process │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────┐
    │ Claude Vision API   │
    │ call fails          │
    └──────────┬──────────┘
               │
        [API error]
               │
               ▼
    ┌─────────────────────┐       ┌─────────────────────┐
    │ Retry with backoff  │──────▶│ Retry 1: wait 2s    │
    │ (max 3 attempts)    │       │ Retry 2: wait 4s    │
    └──────────┬──────────┘       │ Retry 3: wait 8s    │
               │                  └─────────────────────┘
        [all retries failed]
               │
               ▼
    ┌─────────────────────┐
    │ Update status:      │
    │ "error"             │
    │                     │
    │ {                   │
    │   "status": "error",│
    │   "error": {        │
    │     "code": "OCR_   │
    │            FAILED", │
    │     "message": "...",│
    │     "retry_at": null│
    │   }                 │
    │ }                   │
    └─────────────────────┘


SCENARIO 3: Grading Timeout
═══════════════════════════

    ┌─────────────┐
    │ Grading     │
    │ Question 5  │
    └──────┬──────┘
           │
    [takes > 60s]
           │
           ▼
    ┌─────────────────────┐
    │ Timeout reached     │
    │ Partial results     │
    │ available           │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ {                   │
    │   "status":         │
    │     "partial",      │
    │   "graded": 4,      │
    │   "total": 5,       │
    │   "results": [...], │
    │   "warning":        │
    │     "Q5 timed out"  │
    │ }                   │
    └─────────────────────┘
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial system flow documentation |

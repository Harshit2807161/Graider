# Gr8r - User Flow Diagrams

## Overview
This document describes the user flows for the Gr8r grading system, from file upload to results display.

---

## 1. Complete Instructor Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              INSTRUCTOR GRADING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   START     │
                                    │  (Landing)  │
                                    └──────┬──────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │   Create New Session   │
                              │   (Generate Session ID)│
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
           ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
           │    STEP 1     │     │    STEP 2     │     │    STEP 3     │
           │    Upload     │     │    Upload     │     │    Upload     │
           │ Question Paper│     │ Answer Sheets │     │    Rubric     │
           └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                   │                     │                     │
                   ▼                     ▼                     ▼
           ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
           │   Preview     │     │   Preview     │     │   Preview     │
           │   Images      │     │  Thumbnails   │     │   Content     │
           │ (Verify OCR)  │     │ (Multi-page)  │     │  (Text/Img)   │
           └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         │
                                         ▼
                              ┌────────────────────────┐
                              │      Validation        │
                              │  • Files uploaded?     │
                              │  • Formats valid?      │
                              │  • Questions matched?  │
                              └───────────┬────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                         [Invalid]               [Valid]
                              │                       │
                              ▼                       ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Show Errors    │    │   STEP 4        │
                    │  Re-upload      │    │ Submit for Grade│
                    └─────────────────┘    └────────┬────────┘
                                                    │
                                                    ▼
                                         ┌─────────────────┐
                                         │   Processing    │
                                         │    Status       │
                                         │  ┌───────────┐  │
                                         │  │ ████░░░░░ │  │
                                         │  │   45%     │  │
                                         │  └───────────┘  │
                                         │                 │
                                         │ • OCR: Done ✓   │
                                         │ • Triplets: ✓   │
                                         │ • Grading: ...  │
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │    STEP 5       │
                                         │  View Results   │
                                         │   Dashboard     │
                                         └────────┬────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                              ▼                   ▼                   ▼
                    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                    │  View Details   │ │ Export Results  │ │   Re-grade      │
                    │  per Question   │ │   (CSV/PDF)     │ │  (if needed)    │
                    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. MVP Simplified Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MVP USER FLOW (Stateless)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐  │
│   │   Upload   │────▶│   Upload   │────▶│   Upload   │────▶│   Grade    │  │
│   │  Question  │     │   Answer   │     │   Rubric   │     │   Button   │  │
│   │   Paper    │     │   Sheets   │     │            │     │            │  │
│   │            │     │            │     │ (txt/img)  │     │   [GRADE]  │  │
│   └────────────┘     └────────────┘     └────────────┘     └────────────┘  │
│        │                  │                  │                    │        │
│        │    Drag & Drop   │    Multi-file    │   Text or Image   │        │
│        │    or Browse     │    Support       │   Support         │        │
│        │                  │                  │                    │        │
│                                                                   │        │
│                           ┌───────────────────────────────────────┘        │
│                           │                                                 │
│                           ▼                                                 │
│                    ┌─────────────┐                                         │
│                    │  Processing │                                         │
│                    │   Spinner   │                                         │
│                    │             │                                         │
│                    │  ⟳ Grading  │                                         │
│                    │   answers   │                                         │
│                    └─────────────┘                                         │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      RESULTS DASHBOARD                               │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │  Session: abc123           │    Total Score: 23/30 (76.7%)          │  │
│   │                                                                      │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │  Q1 (Science)  ████████░░  8/10                                     │  │
│   │  ▸ Reasoning: Student correctly identified the main concepts of     │  │
│   │               photosynthesis including light absorption...          │  │
│   │  ▸ Feedback: Good understanding. To improve, include more detail    │  │
│   │              about the role of chloroplasts.                        │  │
│   │                                                                      │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │  Q2 (Math)     ██████████  5/5                                      │  │
│   │  ▸ Reasoning: Correct solution with all steps properly shown.       │  │
│   │  ▸ Feedback: Excellent work! Clear methodology and accurate         │  │
│   │              calculation.                                           │  │
│   │                                                                      │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │                                                                      │  │
│   │  Q3 (English)  ██████████  10/15                                    │  │
│   │  ▸ Reasoning: Good argument structure but lacks supporting          │  │
│   │               evidence in the second paragraph.                     │  │
│   │  ▸ Feedback: Consider adding more quotes and examples to            │  │
│   │              strengthen your argument.                              │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. File Upload Flow Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILE UPLOAD INTERACTION                            │
└─────────────────────────────────────────────────────────────────────────────┘

User Action                    System Response
───────────                    ───────────────

1. Click Upload Zone    ──────▶   Open file picker dialog
        │
        ▼
2. Select file(s)       ──────▶   Validate file type
   - Images: jpg, png              │
   - Documents: pdf                │
   - Text: txt, json               ▼
        │                    ┌─────────────────┐
        │                    │  Valid format?  │
        │                    └────────┬────────┘
        │                             │
        │               ┌─────────────┴─────────────┐
        │               │                           │
        │            [YES]                        [NO]
        │               │                           │
        │               ▼                           ▼
        │        Show preview              Show error message
        │        thumbnail                 "Invalid file format"
        │               │
        ▼               ▼
3. Confirm upload  ───────▶   Upload to server
        │                           │
        │                           ▼
        │                    ┌─────────────────┐
        │                    │  Upload to      │
        │                    │  /data/uploads/ │
        │                    └────────┬────────┘
        │                             │
        ▼                             ▼
4. View confirmation  ◀────   Show success message
                              + File info
                              + Preview thumbnail
```

---

## 4. Processing Status Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCESSING STATUS UPDATES                           │
└─────────────────────────────────────────────────────────────────────────────┘

Timeline          Status                    User Sees
────────          ──────                    ─────────

t=0s              INITIATED                 "Starting grading process..."
                       │
                       ▼
t=2s              OCR_QUESTIONS             "Extracting questions from paper..."
                       │                     [████░░░░░░] 20%
                       ▼
t=5s              OCR_ANSWERS               "Reading handwritten answers..."
                       │                     [██████░░░░] 40%
                       ▼
t=8s              OCR_RUBRIC                "Processing rubric..."
                       │                     [███████░░░] 50%
                       ▼
t=10s             FORMING_TRIPLETS          "Matching questions to answers..."
                       │                     [████████░░] 60%
                       ▼
t=12s             GRADING_Q1                "Grading Question 1 (Science)..."
                       │                     [████████░░] 70%
                       ▼
t=15s             GRADING_Q2                "Grading Question 2 (Math)..."
                       │                     [█████████░] 80%
                       ▼
t=18s             GRADING_Q3                "Grading Question 3 (English)..."
                       │                     [█████████░] 90%
                       ▼
t=20s             EVALUATING                "Evaluating grading quality..."
                       │                     [██████████] 95%
                       ▼
t=22s             COMPLETED                 "Grading complete!"
                                            [██████████] 100%

                                            → Redirect to Results Dashboard
```

---

## 5. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ERROR HANDLING FLOWS                              │
└─────────────────────────────────────────────────────────────────────────────┘

Error Type              User Message                    Recovery Action
──────────              ────────────                    ───────────────

FILE_TOO_LARGE          "File exceeds 50MB limit"       → Re-upload smaller file

INVALID_FORMAT          "Unsupported file format"       → Check allowed formats
                        "Allowed: jpg, png, pdf, txt"     Upload correct format

OCR_FAILED              "Could not read text from       → Check image quality
                        image. Image may be too         → Re-upload clearer image
                        blurry or low quality."

NO_QUESTIONS_FOUND      "Could not identify questions   → Check question paper
                        in the uploaded paper."         → Ensure clear formatting

ANSWER_MISMATCH         "Found 5 questions but only     → Check answer sheets
                        3 answers. Some answers may     → Upload missing pages
                        be missing."

GRADING_TIMEOUT         "Grading took too long.         → Retry grading
                        Please try again."              → Contact support

API_ERROR               "Service temporarily            → Wait and retry
                        unavailable. Please retry."     → Check API status
```

---

## 6. State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SESSION STATE MACHINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    IDLE      │
                              │  (No files)  │
                              └──────┬───────┘
                                     │
                            upload question paper
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   QUESTIONS_UPLOADED  │
                         └───────────┬───────────┘
                                     │
                            upload answer sheets
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   ANSWERS_UPLOADED    │
                         └───────────┬───────────┘
                                     │
                              upload rubric
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │     READY_TO_GRADE    │◀──────────┐
                         └───────────┬───────────┘           │
                                     │                       │
                              click "Grade"                  │
                                     │                   retry on
                                     ▼                    error
                         ┌───────────────────────┐           │
                         │      PROCESSING       │───────────┤
                         │                       │           │
                         │  • OCR in progress    │      [on error]
                         │  • Grading in progress│           │
                         │  • Evaluating         │           │
                         └───────────┬───────────┘           │
                                     │                       │
                              [on success]                   │
                                     │                       │
                                     ▼                       │
                         ┌───────────────────────┐           │
                         │      COMPLETED        │           │
                         │                       │           │
                         │  Results available    │           │
                         └───────────┬───────────┘           │
                                     │                       │
                              new session                    │
                                     │                       │
                                     ▼                       │
                              ┌──────────────┐               │
                              │    IDLE      │               │
                              └──────────────┘               │
                                                             │
                         ┌───────────────────────┐           │
                         │       ERROR           │───────────┘
                         └───────────────────────┘
```

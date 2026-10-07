# Proposal 003: Document ingestion (entry modes and file formats)

- **Status:** Accepted (2026-10-06); decisions in §11. M4b (document intake) merged; M4c (exam documents) in review. As built, questions are a flat list carrying their parent's text as context (no `parent_id`), and choice groups live in `exams.config`.
- **Extends:** [Proposal 002](002-grading-v2-architecture.md). Its rubric parser (M4) and grading graph (M5) stay as they are. This proposal adds how questions, answers and rubrics *arrive*.

## 1. Summary

**Today:**
- Questions and rubrics are typed in the app or imported from Excel.
- Each student uploads one answer file: a PDF or image.

**After this proposal:**
- Teachers and students can bring questions, answers and rubrics in any combination of documents: PDF (typed, scanned or mixed), Word and other office files, photos (including iPhone HEIC), or plain text.
- Every combination is turned into the same three things the rest of the system already uses:
  1. the exam's **questions**, with labels and marks;
  2. each question's **rubric text**, which goes to the M4 parser;
  3. each student's **answer text per question**, which goes to grading.

**How documents are processed:**
- Every file is turned into pages by our own code: each page becomes an image, plus its text layer when the PDF was created digitally.
- Vision models read the pages: what kind of page it is, the questions, the rubric, and the student's answers.
- Code then checks and assembles the result.
- The exam's structure is confirmed by the teacher **once**, before any student is graded. Anything the system is unsure about goes to the teacher. Nothing is silently attached or scored zero.

## 2. Principles (from research, sources in §12)

1. **The exam is defined once, before any student pages.**
   - Production tools all confirm the exam's structure up front: Gradescope's outline, Crowdmark's template, the open-source Smart Marking System's "read questions" step.
   - Questions and rubric are extracted once, confirmed by the teacher, and never re-extracted per student.
2. **One way in for every file.** Our code turns each file into page images, so DPI, rotation and size limits are the same whichever model reads them (Claude or self-hosted Qwen3-VL).
3. **Models extract, code checks.** Models classify pages, extract questions, split rubrics by question and segment answers. Code enforces the checks: numbering, mark totals, coverage, duplicates. Code also assembles answers deterministically.
4. **A text layer is a hint, never a replacement.**
   - A digital PDF's text is sent alongside the page image. Claude itself does this for PDFs, and olmOCR found it reduces invented text.
   - Handwriting never has a text layer, so the image is always sent.
5. **Transcription is the main source of error.** One study traced 87% of grading errors to transcription failures, not misapplied rubrics. So:
   - every answer is checked for presence before grading;
   - every answer segment carries a confidence score;
   - unclear cases go to the teacher.
6. **Unplaced answers go to the teacher.** Free-order answer booklets are where production tools fall back to humans: Gradescope asks students to tag pages and switches off its AI for this type. Here, segments the model can't place go to an *unassigned* bucket for the teacher, never silently attached.
7. **Uploaded files are untrusted.** Office documents are converted in a sandboxed container with no network access. All files get type, size and page limits.

## 3. Entry modes

Ingestion has two independent axes:
- **how the exam (questions and rubric) is provided**;
- **how each student's answers are provided**.

Your three modes are combinations of the two (§3.3). Each part of each axis is handled once, so any combination works.

### 3.1 Exam side: where the questions and rubric come from

| # | How the exam arrives | Handling |
|---|---|---|
| E1 | Typed in the app | Today's path |
| E2 | Spreadsheet (XLSX, XLS, CSV) | Today's Excel import, plus CSV |
| E3 | **Question paper document only** | Extract the question structure (§5.3), then the teacher confirms. The rubric is typed, or derived by the parser (M4) |
| E4 | **Question paper + separate rubric document** | Extract questions from the paper. Split the rubric document by question label and link the pieces to questions (§5.4). The teacher confirms both |
| E5 | **One document with both questions and rubric** (a marking scheme that repeats the questions) | Extract questions and rubric from the same pages, linked by position and label |
| E6 | **Rubric document only**, questions already typed or imported | Split the rubric by label and link to the existing questions. Mismatches go to the teacher |
| E7 | **Questions (and rubric) printed on the students' own sheets** (modes A and B) | The teacher uploads a **blank copy** first (decided). The exam is extracted from it and confirmed; every student sheet is then matched against it. The exam is never extracted from a student's sheet |
| E8 | No rubric anywhere | M4 derives criteria from the question and flags them |

### 3.2 Student side: how each student's answers arrive

| # | What the student's file holds | Example | Handling |
|---|---|---|---|
| S1 | **Answers only**, labelled ("Ans 1", "2(b)"), in any order, maybe running onto later pages | Separate answer booklet | Page-by-page segmentation using the exam's labels; answers that continue across pages are joined in code (§5.5) |
| S2 | **Printed question paper with answers in the gaps** | Worksheet; typed questions with handwriting underneath | Answers are found under each printed question. Printed text is excluded from the answer (using the text layer and the blank copy) |
| S3 | **Questions + rubric + answers in one document** | Worksheet that also prints the marks or rubric | Same as S2, and the printed rubric is excluded from the answer too |
| S4 | **Typed answers** | DOCX or PDF homework, essays | Text layer first; page image for diagrams and equations |
| S5 | **Several files make up one submission** | One phone photo per page | Uploaded as one submission, pages kept in upload order. The teacher can reorder them |
| S6 | **One file for the whole class** | A stack of scripts scanned together | Split into students (§5.7). **Proposed as a later phase** (open question 2) |

### 3.3 Your three modes

| Your mode | Exam side | Student side | The hard part |
|---|---|---|---|
| **A**: questions, answers and rubric all in one document (typed PDF, appended scans, DOCX, or photos of typed questions and rubric with typed or handwritten answers underneath) | E7 (blank copy) | S3 | Don't transcribe printed question or rubric text as the student's answer. Don't re-extract the exam per student |
| **B**: questions and answers in one document, rubric in a separate document keyed by question number | E7 (or E1–E3) for questions, E6 for the rubric | S2 | Linking rubric labels to the printed numbering ("3" vs "3(a)"); finding answers under the printed questions |
| **C**: question paper, separate answer booklet ("Ans 1, 2, 3…"), rubric as a third file | E4 | S1 | Free-order answers, answers continuing across pages, sub-parts, crossed-out work, unlabelled answers |

## 4. File formats

Each upload is checked against an allowlist of extensions **and** by reading the file's first bytes (`filetype`). Office files are also checked inside their ZIP container. The browser's declared file type is never trusted.

| Format | How it's turned into pages | Text layer | Notes |
|---|---|---|---|
| PDF, digital (typed) | `pypdfium2` renders each page (replacing poppler/pdf2image) | Yes, per page | Text that's garbled (no Unicode map) is detected and dropped |
| PDF, scanned | Render each page | No (a scanner's own OCR layer is ignored) | Deskewed if needed |
| PDF, mixed (typed pages and scans, or typed questions with handwriting on the same page) | Each page judged separately (§5.2) | Typed parts only | Handwriting never has a text layer; the image is always sent |
| PDF with a password | An empty password is tried; otherwise rejected with "please upload an unlocked copy" | – | – |
| DOCX | Sandboxed LibreOffice (Gotenberg) → PDF → pages | Yes | `python-docx` reads tables and structure. Equations survive in the rendered page image, not in plain text. Macro-enabled files (`.docm`) are rejected |
| DOC, ODT, RTF | Gotenberg → PDF | Yes | Embedded objects and remote images are blocked |
| PPTX | Gotenberg → PDF | Yes | Rare; supported because the conversion is the same |
| Google Docs, Sheets, Slides | Teacher exports to PDF, DOCX or XLSX | – | A Drive integration can come later |
| XLSX, XLS, CSV | Today's question import (CSV added) | Yes | For structured questions and rubrics, not answers |
| TXT, Markdown | Read as UTF-8 text | Yes | Typed answers or rubrics |
| JPEG, PNG, WebP | Pillow: fix orientation from EXIF, convert to RGB, straighten, resize | No | Re-encoded before use |
| HEIC, HEIF (iPhone) | `pi-heif` decodes → PNG | No | Neither Claude nor vLLM accepts HEIC directly |
| TIFF (multi-page) | One page per frame | No | Page count capped |
| GIF, BMP | First frame → PNG | No | – |
| **Not supported** | Video; archives (ZIP of images: use multi-file upload instead, which avoids zip bombs); macro-enabled office files; encrypted PDFs we can't open | – | Rejected with a clear message |

**Page images:**
- Rendered at **200 DPI**, long edge capped at **2576 px**. That is the highest resolution Claude Opus 5.5 uses, roughly an A4 page at 200 DPI. Today's setting is 150 DPI capped at 1600×2200.
- Pages go to models one at a time or in small batches.
- Ollama needs `OLLAMA_CONTEXT_LENGTH` raised from its 4,096-token default, or multi-page prompts get cut off.
- DPI is a setting, to be tuned in the M8 evals.

## 5. Pipeline

```
upload ─▶ intake ─▶ pages ─▶ page classification ─┬─▶ exam extraction ─▶ teacher confirms ─▶ questions + rubric text ─▶ M4 parser
                                                  └─▶ answer segmentation ─▶ assembly + checks ─▶ answers per question ─▶ M5 grading
```

### 5.1 Intake
- **Documents.** Each upload becomes a `documents` row: who uploaded it, the exam, the submission (for answer files), and the **role the uploader declared** (question paper / rubric / both / answers / mixed).
- **Storage.** The file is stored under a generated name with its SHA-256 hash. The original filename is kept for display only.
- **Limits:** size, page count, and pixel count per page (guarding against decompression bombs).

### 5.2 Pages
- **Rows.** `document_pages` has one row per page: the image (path and hash), size, DPI, rotation applied, the text layer if any, and a **digital / scanned / mixed** judgement.
- **The judgement uses page measurements:**
  - how many characters can be extracted;
  - the share of garbled characters;
  - how much of the page images cover.
- **Scanner text.** A page covered by an image *and* carrying text is a scan with the scanner's own OCR. Its text is only a hint.
- **Phone photos:**
  - straightened by detecting the page outline (OpenCV); skipped if no clear outline is found;
  - contrast adjusted gently;
  - never forced to pure black and white, which can erase faint pencil.

### 5.3 Page classification
- **Classify.** One vision call per page labels it: question paper, rubric, answers, mixed (printed questions and student writing), cover, blank, or other. It also records:
  - whether the page is typed, handwritten or both;
  - question labels visible on the page, as written;
  - student name or ID if visible.
- **Disagreements.** If the classification contradicts the declared role (e.g. a "rubric" upload made of answer pages), the teacher is asked. It's never silently overridden.

### 5.4 Exam extraction (once per exam)
- **Questions → a question tree.** Each question has:
  - a **canonical label**: `1`, `2(a)`, `2(b)(ii)`;
  - the label as printed;
  - question text, including the context of its parent question;
  - marks;
  - order;
  - an optional **choice group** ("attempt either 5 or 6", "any 3 of 5").
- **Rubric.** A rubric document is split into per-question rubric text, keyed by label. Each piece is linked to a question by canonical label. Where the numbering doesn't match exactly (e.g. "3" vs "3(a)"), the model suggests a link and the teacher confirms it.
- **Checks in code:**
  - labels are unique and continuous;
  - marks add up to the paper's stated total, when one is printed;
  - every rubric piece links to exactly one question;
  - each question has rubric text, or is flagged "derived".
- **Draft → confirm.** The result is a versioned **exam draft**. The teacher confirms it in one step, which creates the questions (with rubric text) and triggers M4 parsing. Until confirmed, no student submission is graded.

### 5.5 Answer segmentation (per student)
- **Per-page transcription.** Each page is transcribed into **segments**, constrained to the confirmed labels. Each segment has:
  - the label as written and the canonical label (or *unassigned*);
  - text;
  - whether it starts an answer or continues one;
  - "continued on p. 7"-style pointers;
  - crossed-out work, recorded but excluded from the answer;
  - confidence.
- **Pages with printed content (S2, S3).** Only the student's own writing or typing is transcribed. The printed text is known from the text layer and from the confirmed questions, so it's excluded. The blank copy, when there is one, helps further.
- **Assembly in code:**
  - segments are ordered by page and continuations joined;
  - duplicate attempts are kept apart and flagged;
  - for a choice group, the attempted option is picked (if both were attempted, an exam setting decides: best or first, and it's flagged);
  - unlabelled segments go to the *unassigned* bucket.
- **Presence check.** A question with no segment is "no answer found" and goes to the teacher. It is never auto-scored zero. This was already decided in Proposal 002.

### 5.6 Storage for review and regrades
- The page map (segments, with page and region) is stored per submission.
- Grading reads from it, so a regrade doesn't redo segmentation.
- A teacher can fix one assignment, e.g. "this paragraph is 3(b)". Only that question is then regraded. This is M5's planned transcript-edit regrade, applied to segments.

### 5.7 Class-batch files (S6, proposed later)
Split one scan into students, most reliable method first:
1. Gr8r-printed cover sheets or QR codes.
2. Matching the first page against the blank copy.
3. Model-detected boundaries in small page windows. Large windows degrade sharply in published tests.

Names and IDs are then fuzzy-matched to the class roster. The teacher confirms the split, shown as thumbnails, before anything is graded.

## 6. Mode-by-mode walkthrough

**Mode A: questions, answers and rubric in one document per student**
1. The teacher sets up the exam by uploading a blank copy (E7). Extraction (§5.4) separates questions, marks and rubric, and the teacher confirms.
2. Each student's document goes through page classification: pages are mixed or answer pages.
3. Segmentation transcribes only the student's writing under each printed question, excluding printed question and rubric text.
4. Assembly → presence check → grading.

The same flow covers each form mode A can take: all typed (S4), appended scans, DOCX, or photos (S5).

**Mode B: questions and answers in one document, rubric separate**
1. The exam's questions come from a blank copy (E7), or are typed or imported.
2. The rubric document is split by label and linked (E6). Numbering mismatches go to the teacher.
3. Students: pages are mixed (S2) → segmentation under the printed questions → assembly.

**Mode C: question paper, answer booklet, rubric**
1. The question paper becomes the question tree, and the rubric is split and linked (E4). The teacher confirms both.
2. Students: booklet pages are answer pages (S1). Segmentation labels each part "Ans 3", "3 contd", "(b)", and so on.
3. Assembly orders segments, joins continuations, puts unlabelled parts in the unassigned bucket, and resolves choice groups.

## 7. Data model (new or changed)

| Table / column | Purpose |
|---|---|
| `documents` | One row per upload: org, exam, optional submission, declared role, stored path, SHA-256, type, page count, status |
| `document_pages` | One row per page: image path and hash, size, DPI, rotation, text layer, digital/scanned/mixed, classification (kind, labels seen, identity), model call id |
| `exam_drafts` | Versioned extracted question tree, linked rubric and check results, plus who confirmed it and when. Append-only |
| `questions` + `label` (canonical), `printed_label`, `parent_id`, `choice_group` | Labels come from the paper instead of Q1..Qn. Sub-parts and choices become possible |
| `answer_segments` (or M5's `transcriptions`, extended) | Per page: label, start or continuation, text, crossed-out flag, confidence, region, model call id |
| `submissions` | Gain the list of their documents (several files for one submission) |

Every model call is recorded in `llm_calls` and traced in Langfuse, as now. Page images are stored by reference and hash, never inlined into audit rows or traces.

## 8. Tooling and deployment

| Need | Choice | Licence | Why |
|---|---|---|---|
| PDF render + text | `pypdfium2` | BSD-3 / Apache-2.0 | Fast; no JavaScript engine; lets us drop poppler (GPL). **Not PyMuPDF (AGPL)** |
| PDF metadata, encryption | `pypdf` | BSD-3 | Already used |
| Images | Pillow, `pi-heif`, `opencv-python-headless` | MIT-CMU, LGPL (bundled libraries), Apache-2.0 | HEIC decoding; page straightening |
| Office → PDF | **Gotenberg** sidecar container (LibreOffice inside) | MIT (MPL-2.0 for LibreOffice) | Blocks local file access and remote URLs; restarts LibreOffice regularly; has timeouts |
| Word structure | `python-docx` (+ `defusedxml` for spreadsheets) | MIT | Tables and structure as hints |
| File type detection | `filetype` | MIT | Reads file signatures; no system library needed |
| Rejected | Docling (too heavy for now), Unstructured (many system dependencies), Marker (model weights limited to small organisations), MinerU (licence conditions) | – | – |

**Security:**
- Gotenberg runs with no network access, as non-root, on a read-only filesystem, with CPU and memory limits.
- Every conversion has a time limit.
- Office files are checked inside their ZIP container: uncompressed size, compression ratio, file count, and macros.
- PDFs and images are capped by page count and pixel count.

## 9. Testing (every mode and format supported **and tested**)

**1. Fixture generator** (`backend/tests/ingestion_fixtures.py`, deterministic, no binary files committed):
- One small exam spec: 4 questions, including a sub-part, an OR-choice and a math question.
- Rendered as:
  - a typed PDF (`reportlab`, BSD);
  - a DOCX (`python-docx`), with a table and an equation;
  - "scanned" versions: rendered pages rotated, noised, JPEG-compressed, with phone-like perspective;
  - HEIC and multi-page TIFF;
  - a mixed PDF (typed pages plus scanned pages).
- Combined into every mode: A, B, C, and S4/S5.
- Answers on combined pages use a handwriting-style font as a stand-in for unit and integration tests. Real handwriting comes from the owner's scans (see open question 5).

**2. Unit tests (no model calls):**
- type detection: wrong extension, spoofed signature, macro DOCX, zip bomb, encrypted PDF, oversized image;
- page rendering, DPI and size caps;
- digital/scanned detection;
- EXIF rotation and HEIC decoding;
- Gotenberg conversion, run in CI as a service container.

**3. Pipeline tests with `FakeInvoker`:**
- routing per mode;
- declared-role mismatch → teacher;
- exam draft checks (marks total, duplicate labels, rubric linking, "3" vs "3(a)");
- assembly (out-of-order answers, continuations, unassigned parts, duplicate attempts, both OR options attempted);
- presence check;
- regrade of a single segment.

**4. Live tests** (`pytest -m live`, Qwen3-VL locally, Claude when a key is set):

| Mode | Formats |
|---|---|
| A | Digital PDF, DOCX, photo set |
| B | Mixed PDF + rubric DOCX |
| C | Scanned PDF + question-paper PDF + rubric PDF |

Measured:
- page classification accuracy;
- label-mapping accuracy;
- character error rate (CER) against known answer text;
- how often parts end up unassigned.

**5. Evals (M8):** DPI 150 vs 200 vs 300, with vs without text layer, Claude vs Qwen3-VL.

## 10. Milestones (proposed placement)

| Milestone | Scope | Depends on |
|---|---|---|
| **M4b: Document intake** | `documents` / `document_pages`; format detection and conversion for every format in §4; Gotenberg sidecar; security limits; page rendering at 200 DPI; multi-file submissions; unit tests for every format | M4 |
| **M4c: Exam documents** | Page classification; question-tree extraction (labels, marks, sub-parts, choice groups); rubric splitting and linking; exam draft and confirm API; modes E3–E7; pipeline and live tests | M4b |
| **M5: Grading graph v2** (already planned) | Its page-by-page transcription becomes answer segmentation (§5.5) for S1–S5, plus assembly, the unassigned bucket and choice groups | M4c |
| **M7** (already planned) | Adds screens to review exam drafts and segments (unassigned parts, page map) | M6 |
| **Later: class batches** (S6) | Cover sheets / QR codes, boundary detection, roster matching, split review | M5 |

## 11. Decisions and open items

**Decided (2026-10-06):**
1. **Mode A exam source:** the teacher uploads a **blank copy** first. The exam is never extracted from a student's sheet.
2. **Class batches (S6):** a later phase, after M5.
3. **Choice questions** ("attempt either / any k of n"): supported **now**. Choice groups are part of M4c's question tree; M5 grades the attempted option and flags both-attempted cases.
4. **Printable Gr8r QR booklets:** not now (backlog).
5. **Gotenberg** sidecar (sandboxed LibreOffice) for DOCX, DOC, ODT, RTF and PPTX: approved.

**Still open:**
6. **Real handwriting for live tests:** a few consented scans or photos per mode from the owner. Public datasets such as IAM are mostly non-commercial-only.

## 12. Sources

- **Production tools:** Gradescope templates, outlines, variable-length assignments and AI-assisted grading (guides.gradescope.com); Crowdmark templates and automated matching (crowdmark.com/help); CoGrader page split/merge (intercom.help/cograder); Smart Marking System (github.com/twahidin/smart-marking-system).
- **Research:**
  - transcription causing most grading errors (arXiv 2605.19043);
  - crossed-out work and unlabelled problems (2406.17859);
  - presence check before grading (2601.00730);
  - partial-credit agreement (2608.20521);
  - splitting page streams (2609.22620);
  - interleaved pages (2602.15958);
  - Pensieve (2507.01431);
  - olmOCR text layer used as an anchor (2502.18443).
- **Mark schemes:** CBSE Class X 2025–26 science marking scheme (internal choice, "any two", alternatives); UK mark-scheme abbreviations (ft, cao, oe, isw).
- **Tooling:**
  - **PDF and imaging:** pypdfium2, pypdf (and its security advisories), PyMuPDF (AGPL), pi-heif / pillow-heif licences, Pillow decompression-bomb guard, opencv-python-headless.
  - **Office conversion:** Gotenberg, LibreOffice security advisories.
  - **Upload safety:** `filetype`, OWASP File Upload Cheat Sheet.
  - **Model limits:** Claude PDF support and vision limits (platform.claude.com), Qwen3-VL, vLLM multimodal inputs, Ollama FAQ (context length).

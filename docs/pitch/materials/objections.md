# Objections and answers for calls

Grouped by who usually asks; any audience can raise any of them. Answer from today's product, and say "we don't know yet" when that is the truth.

## Principals, trustees and coaching-centre heads

**"Our students' handwriting is bad. Can it read it?"**
In our one real test, a small model read clean handwriting well. We haven't yet tested messy, mid-scoring scripts, and that's the next test. When it can't read a page confidently, it doesn't guess: the answer goes to your teacher with the reason "handwriting hard to read". The quickest way to know is to try one of your own sheets. Shall we do that on a call this week?

**"We have our own marking scheme, with part marks."**
That's what it marks against. Your marking scheme is broken into criteria, your teacher confirms them before any sheet is marked, and each criterion gets its own score with a quote from the student's answer as evidence. Half marks happen: in our real test, one answer moved from 3 to 3.5 to 4 out of 5 as the two examiners discussed it. Send us one question with its scheme and we'll show you.

**"Our students write in other languages too."**
We haven't tested Gr8r on answer sheets in any language other than English, so we won't promise anything there. If some of your sheets are in another language, we can try a handful in the pilot and tell you honestly what happened, or keep the pilot to an English-medium exam.

**"What happens to student data?"**
Sheets and page images are stored as files on Gr8r's server, and marks and transcripts in its database. To read and mark, page images go to the AI provider we use (Anthropic or OpenAI) and the answer text to the marking models; we send no student names, though a name written on a page is in its image. Encryption at rest and a retention period are planned, not built. Everything can run on self-hosted models instead.

**"What if it gives a wrong mark?"**
It will sometimes: in our one real test, four written answers were marked wrongly without a flag, and we're fixing why. That's why your teacher sees every mark with its evidence, can change any mark with a reason, and must approve before any student sees a result. Every change is recorded. The pilot measures how often your teacher changes a mark, against a target we agree in writing first.

**"Isn't this what went wrong with CBSE's on-screen marking in 2026?"**
That was board marking, and we don't do board marking. In 2026 CBSE moved Class 12 marking on-screen; there were complaints about scan quality, CBSE said vulnerabilities in its vendor's portal were contained, and over 13,000 hard-to-read sheets were checked manually. Press reports quote CBSE saying AI was not used. Gr8r is for internal exams, a teacher approves every result, and pages it can't read go to the teacher.

**"Can it mark diagrams?"**
Not yet. The reader describes some drawings in words and misses others, and today a missed drawing can be scored zero without being flagged. So in a pilot we list every question that expects a drawing before marking starts, and your teacher marks those in the review screen. Sending them to the teacher automatically is on our list of fixes.

**"What will parents say about AI marking?"**
Parents and students see only results a teacher has approved and published; nothing goes out automatically. If a parent questions a mark, your teacher can show the criterion, the quote from the student's answer and the reasoning, and any change is recorded with its reason. How you describe it to parents is your decision; we can help you word it.

**"How long does setup take?"**
We do the setup. You give us the question paper and marking scheme; we type them in, import them from Excel, or extract a draft from the PDFs, and your teacher confirms it before marking. We haven't timed a school setup yet. On the one real board paper we tried, the extracted draft needed too many fixes, so we typed it. In the pilot, setup is week one.

## Professors

**"Why not just paste answers into ChatGPT?"**
A chat window gives you a mark with no check on it. Gr8r reads whole handwritten answer books, files each answer under its question, marks each criterion of your rubric with a quote that code checks is in the transcript, has a second, different model score it before reviewing the first grade, sends disagreements to you, and records every call and change. It can use the same kinds of models. Want to compare the two on one of your tests?

**"Can I run it on our own models?"**
Yes. Every model role (page reading, rubric parsing, marking, checking) can run on an open-weight model you host with vLLM or SGLang, on Claude or OpenAI, or a mix, with fallback either way and a switch that forbids falling back to an outside provider. Which open model is good enough for each role hasn't been measured yet; a comparison on your course would be useful to both of us.

## Investors

**"What does a sheet cost you?"**
One data point: our first real-paper test, a 31-page handwritten answer book, cost about 22 US cents in model calls on small OpenAI models (gpt-4.1-mini and gpt-4.1). That's from token counts and list prices, not an invoice, and from one run. Our default models are larger and haven't been run on that paper. Pilots are free; pricing will be per sheet, set after the pilots.

**"Isn't this a ChatGPT wrapper?"**
The models are swappable on purpose: every role runs on Claude, OpenAI or self-hosted open-weight models. What we built is around them: page reading and stitching across pages, criterion marking with code-checked evidence, a second examiner, escalation instead of guessing, teacher review and approval, and an append-only audit trail of every call and change. The next proof is measured accuracy against teachers, which we're building now.

---
Sources: `docs/pitch/positioning.md` (proof table, honest section, what we do not say), `docs/pitch/checkpoint-1.md` (pricing stance, no language named), `docs/pitch/research/claims.md` §1 (CBSE 2026, confirmed facts only), `docs/pitch/research/sample-sheet-facts.md` (storage, providers, not built, escalation texts, answer 35(a)), `docs/evals/cbse-x-science-2025/README.md` (handwriting, silent errors, diagrams, extraction, cost), `docs/v2-backlog.md` ("Diagrams score 0 without escalating"), `docs/deploy/open-weight.md` (open-weight roles, not yet measured).

# Pre-seed deck outline

Frame: Gr8r is vertical AI for assessment with a teacher in the loop, not edtech. The ask is design partners now and measured accuracy next. Every number on a slide carries its source and caveat beside it. Where a slide needs a figure we don't have, it says where to find it and stays blank until then.

## 1. Gr8r: AI marking for handwritten answer sheets. It shows its working.

**Must prove:** what the company does, in one line a non-specialist understands.
**Evidence today:** the headline and the mechanism sentence ("reads each handwritten page, awards each mark on your own marking scheme with a quote from the student's answer as evidence, has a second model check the grade, and sends anything it can't settle to the teacher instead of guessing"), from `docs/pitch/positioning.md`. Graider, Delhi, India (`checkpoint-1.md`).
**Slot to fill:** logo, domain, contact address (not decided yet).

## 2. The problem: handwritten answer sheets are marked by hand, one at a time

**Must prove:** that schools, coaching centres and college teachers spend real time marking internal tests, and that it hurts.
**Evidence today:** none measured. The campaign plan's view that coaching centres mark hundreds of sheets per mock test is our hypothesis, not a fact (`campaign-plan.md`).
**Slot to fill:** teachers' own time per sheet, measured by hand in each pilot (success criterion 2 in `materials/pilot-offer.md`); quotes from pilot teachers, with permission.

## 3. Why the method matters: marking is a trust problem

**Must prove:** that schools and parents need to see how a mark was decided, so a transparent method is the product, not a feature.
**Evidence today:** in 2026 CBSE moved Class 12 marking on-screen; the rollout drew public complaints about scan quality and portal security, and CBSE said AI was not used to mark papers (`research/claims.md` §1, CONFIRMED; the "AI not used" statement is from press reports, not a CBSE document). Use this only as context; Gr8r does not do board marking.
**Slot to fill:** what pilot principals and parents asked about trust, from the pilots.

## 4. How it works

**Must prove:** that the method is specific and checkable, not a single prompt.
**Evidence today:** pages read in parallel and answers stitched across pages; each mark cites a rubric criterion, a quote and a justification, and code checks the quote is in the transcript; a second, different model scores the answer itself first, then reviews the grader's evidence in the same call; disagreement beyond a threshold goes to revision (at most two) and then to the teacher (`positioning.md` proof table; Proposal 002 §2 and §7; `backend/app/grading/question.py`, `checks.py`).
**Slot to fill:** a one-page diagram of the flow.

## 5. It shows its working: one graded answer

**Must prove:** what a teacher actually sees for one answer.
**Evidence today:** the review screen shows the transcript, each criterion's score with highlighted evidence, and the examiners' rounds (`research/sample-sheet-facts.md`). A good real example, CBSE answer 35(a) (grader 3 to 3.5 to 4 of 5 over three rounds), was escalated for a wrong reason, and the CBSE material is CBSE's own documents.
**Slot to fill:** the sample sheet decided at checkpoint 3 (the team-written sample is recommended; `checkpoint-1.md` item 7). Do not show 23, 33, 34(b) or 38(a)-(b) as correct.

## 6. The teacher stays in charge

**Must prove:** that nothing reaches a student without a teacher, and that every change is traceable.
**Evidence today:** answers it can't find are escalated, never given zero automatically; other escalation reasons include low reading confidence, failed checks and examiner disagreement. Teachers override any criterion with a mandatory reason, correct transcripts, approve and publish; students see only published results. Every model call, version and teacher action is stored append-only (`positioning.md` proof table; CHANGELOG M5 to M7; `docs/audit-trail.md`).
**Slot to fill:** escalation rate and teacher review time from pilots.

## 7. What is built today

**Must prove:** that this is a working product, not a prototype or a wrapper.
**Evidence today:** a multi-tenant web app working end to end: organisations, classes, exams, marking schemes typed, imported from Excel or extracted into a draft the teacher confirms; uploads of PDFs, photos and office documents with safety checks; the review queue and review screen; approvals and publishing; a student view (`.claude/CLAUDE.md`; `positioning.md` proof table).
**Slot to fill:** screenshots of the review screen with the sample sheet.

## 8. Model-agnostic by design

**Must prove:** that Gr8r is not tied to one model provider and can serve schools that want data kept in-house.
**Evidence today:** each model role can run on Claude, OpenAI or a self-hosted open-weight model (vLLM or SGLang), with fallback either way and a switch to forbid external fallback (`docs/deploy/open-weight.md`; Proposal 002 §5). Which open model is good enough for each role has not been measured (`open-weight.md`).
**Slot to fill:** a measured comparison of open-weight and API models on the same sheets.

## 9. First real-paper run: what held and what broke

**Must prove:** that we test on real material and are honest about the result.
**Evidence today:** one real 31-page handwritten CBSE Class X Science answer book, read and its 44 answers marked or escalated in 61 seconds, for about 22 US cents in model costs on small OpenAI models (gpt-4.1-mini, gpt-4.1); costs from token counts and list prices, not an invoice. Most lost marks came from filing answers under the wrong question and from content the reader skipped, before grading began; four written answers were wrong without a flag (`docs/evals/cbse-x-science-2025/README.md`). This was a smoke test; do not show the run's total as a result.
**Slot to fill:** the same paper after the fixes listed in the README and backlog.

## 10. Measured accuracy (next)

**Must prove:** agreement with teachers, with the method beside the number.
**Evidence today:** none. The plan: hand-mark the CBSE script from the examiner's ticks, add the 50 teacher-marked sheets of the Mendeley exam set (CC BY 4.0), and measure agreement in every pilot (`cbse-x-science-2025/README.md` "What this says about the product"; `campaign-plan.md` measures).
**Slot to fill:** agreement with teachers per answer and per mark, escalation rate, silent-error rate, with method and sample size.

## 11. Market

**Must prove:** who buys and how many there are.
**Evidence today:** buyers by audience: principals and trustees, coaching-centre heads, and professors for one course each (`positioning.md`). Market note, one line only: Inc42 reported Indian edtech funding fell to $249M across 31 deals in 2025, an eight-year low (Inc42, 15 Jan 2026; `research/claims.md` §3, CONFIRMED).
**Slot to fill:** market size, left blank. Sources to find: UDISE+ (Ministry of Education) for the number of schools and enrolment by stage; AISHE for colleges and higher-education enrolment; a published, dated report with a stated method for coaching centres. Cite each figure with its source and year.

## 12. Competition

**Must prove:** that the space is real and that Gr8r's position in it is clear.
**Evidence today:** of the competitors surveyed, only CoGrader publishes a method and its limitations, none offers a graded sheet a visitor can inspect, and no Indian competitor surveyed publishes a method (`research/claims.md` §6, checked 2026-10-12). Y Combinator has backed AI grading companies, including Edexia (W25) and Frizzle (S25) (`research/claims.md` §4; do not say they raised "on pilots alone").
**Slot to fill:** a positioning table recheck before the deck goes out (the survey used page fetches and may have missed JavaScript-loaded content).

## 13. Business model and go-to-market

**Must prove:** how Gr8r makes money and how it reaches buyers.
**Evidence today:** pilots are free; pricing is per answer sheet after the pilot, with no number yet (`checkpoint-1.md` item 6). Model cost per sheet: the one data point on slide 9; the default Claude models have not been run on that paper (`research/sample-sheet-facts.md`). Go-to-market: schools and coaching centres first, professors in parallel, a free four-week pilot with written success criteria and a paid-or-stop decision (`campaign-plan.md`; `materials/pilot-offer.md`).
**Slot to fill:** the price per sheet; model cost per sheet on the production models; pilots signed and converted.

## 14. Team and the ask

**Must prove:** who is building this, and what we are asking for.
**Evidence today:** founders Kirtan Jain, Parth Agarwal and Harshit Dhankhar; Graider, Delhi (`checkpoint-1.md`). The ask: design partners now, measured accuracy next (`positioning.md`).
**Slot to fill:** founders' backgrounds and roles (to be collected at checkpoint 3); the amount being raised and its use, if any (Kirtan's call); named design partners, with permission.

---
Sources: `docs/pitch/positioning.md`, `docs/pitch/checkpoint-1.md`, `docs/pitch/campaign-plan.md`, `docs/pitch/research/claims.md` (§1, §3, §4, §6), `docs/pitch/research/sample-sheet-facts.md`, `docs/evals/cbse-x-science-2025/README.md`, `docs/deploy/open-weight.md`, `.claude/CLAUDE.md`.

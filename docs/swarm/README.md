# Backlog sweep swarm, 2026-10-14 (19:05–19:30 IST)

A parallel sweep of `docs/v2-backlog.md` items. Every item was worked on its own branch in its own worktree,
cut from `pitch/website-and-campaign` at 3d7d145. Integration branch: `swarm/backlog-sweep`
(worktree `../Graider-swarm`). The session had a hard cut at 19:30, so some branches may hold `wip(...)` commits
with a `docs/swarm/<key>.md` note describing what remains.

## How to recover

```bash
git worktree list                                  # all swarm worktrees live under ../Graider-wt/<key>
git log --oneline swarm/backlog-sweep..swarm/<key> # what a branch added
# merge every finished branch into the integration branch:
bash <scratchpad>/merge.sh   # or: cd ../Graider-swarm && git merge swarm/<key>
cd backend && .venv/bin/pytest -q && .venv/bin/ruff check app tests alembic
cd frontend && npx tsc --noEmit && npm run lint
```

Unmerged branches are safe to merge later; delete a worktree with `git worktree remove ../Graider-wt/<key>`.

## Items and branches

| Branch `swarm/…` | Backlog item | Area |
|---|---|---|
| (cherry-picked 3e04538) | Draft stays pending forever on an unexpected extraction error → marked failed | exam_drafts |
| tests-ignore-env | Tests read backend/.env | tests |
| same-model-warning | Grader and evaluator on the same model → config warning | llm |
| evidence-check | Evidence check discards correct grades → per-line matching, keep score and escalate | grading |
| rubric-as-questions | Marking scheme extracted as questions loses its rubric | exam_drafts |
| drawing-escalation | Diagrams score 0 without escalating → escalate `drawing_expected` | grading |
| reader-question-context | Page reader sees only 200 chars of a question | grading prompts |
| garbled-symbols | Control characters for arrows/apostrophes in transcripts | grading transcribe |
| unpriced-model-refusal | Refuse to start with an unpriced API model | llm |
| document-delete | DELETE exam documents no confirmed draft uses | api |
| frontend-css-dedupe | Shared skeleton/spin keyframes | frontend |
| frontend-class-detail | Class detail page | frontend |
| overview-summary | Overview summary endpoint | api + frontend |
| struck-words | One struck word removes a whole segment | grading |
| reparse-old-prompt-specs | Admin command to re-parse AI specs made with an older prompt | rubrics |
| rubric-hidden-from-students | Students can read rubric text | api |
| page-read-completeness | Page inventory check (labels and drawings seen vs segments produced) | grading |
| bilingual-papers | Bilingual question papers extract as duplicates | exam_drafts |
| stale-rubric-flag | "Graded with an older rubric" flag in review | api + frontend |
| gotenberg-retry | Retry a 503 once; longer LibreOffice start timeout | ingestion |
| failure-codes | Failure code stored next to current_step | models + frontend |
| budget-per-page | Budget top-up per page | llm + grading |
| transcript-side-by-side | Transcript correction next to the page image | frontend |
| student-criterion-marks | Per-criterion marks for students | api + frontend |
| audit-export | Per-student export of runs, calls and decisions | api |
| printable-result | Printable graded copy for students | frontend |
| choice-split-editor | Internal choices: offer the split in the draft editor | exam_drafts + frontend |

Rules every agent followed: no live model calls (OpenAI spend stays at zero), no CHANGELOG/backlog edits
(done at merge), tests with the fake LLM, conventional commits.

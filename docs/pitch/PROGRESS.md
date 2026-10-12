# Pitch project: progress

Brief: [fable-brief.md](fable-brief.md). Branch: `pitch/website-and-campaign` (from `eval/cbse-science-first-run`, which holds the eval data). Orchestrator: Fable; subagents on Opus (anything a visitor reads or sees) or Sonnet (mechanical work).

## Status
- 2026-10-12: started. Phase 1 (positioning, site map, campaign outline, checkpoint-1 questions) in progress.

## Phase 1: before checkpoint 1
- [x] Branch created
- [ ] Research: claims in the brief verified against primary sources → `research/claims.md` (Sonnet)
- [ ] Research: reference sites torn down in a real browser → `research/reference-sites.md` (Opus)
- [x] Research: review components, eval data, tokens, product facts for the sample sheet (Sonnet) → `research/sample-sheet-facts.md`
- [x] `positioning.md`: category headline, mechanism, per-audience message, proof today, what we don't claim
- [x] `site-map.md`: pages, each page's job, primary CTA, content module per page
- [x] `campaign-plan.md` (outline; facts marked *(verify)* pending)
- [x] `checkpoint-1.md`: the questions only Kirtan can answer, in one batch
- [ ] Commit, then stop for Kirtan

## Decisions made without Kirtan (brief says: make reasonable choices, note them)
- Branch from the eval branch rather than `v1-full`, because the sample sheet needs `review.json` and the brief lives here. The PR target is decided later with Kirtan (the eval branch may merge first).
- The superpowers brainstorming skill was not run: the brief is the output of that step and says not to ask outside checkpoints.

## Open questions (collected for checkpoint 1)
See `checkpoint-1.md` once written.

## Later phases
- Phase 2 (after checkpoint 1): design direction, 2–3 rendered home-page first screens + sample-sheet section → checkpoint 2.
- Phase 3: build site (`site/`), pitch materials, campaign plan in full, privacy page, claims register → checkpoint 3.

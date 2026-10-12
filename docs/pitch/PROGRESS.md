# Pitch project: progress

Brief: [fable-brief.md](fable-brief.md). Branch: `pitch/website-and-campaign` (from `eval/cbse-science-first-run`, which holds the eval data). Orchestrator: Fable; subagents on Opus (anything a visitor reads or sees) or Sonnet (mechanical work).

## Status
- 2026-10-12: started. Phase 1 complete; **waiting on checkpoint 1** (`checkpoint-1.md`).

## Phase 1: before checkpoint 1
- [x] Branch created
- [x] Research: claims in the brief verified against primary sources → `research/claims.md` (Sonnet). Several quotes came via summarising fetches; recheck on the live page before anything goes public.
- [x] Research: reference sites torn down in a real browser (Playwright + local Chromium; DevTools MCP profile was locked) → `research/reference-sites.md` (Opus). Screenshots in the session scratchpad only.
- [x] Research: review components, eval data, tokens, product facts for the sample sheet (Sonnet) → `research/sample-sheet-facts.md`
- [x] `positioning.md`: category headline, mechanism, per-audience message, proof today, what we don't claim
- [x] `site-map.md`: pages, each page's job, primary CTA, content module per page
- [x] `campaign-plan.md` (outline; facts marked *(verify)* pending)
- [x] `checkpoint-1.md`: the questions only Kirtan can answer, in one batch
- [x] Commit, then stop for Kirtan (2026-10-12)

## Decisions made without Kirtan (brief says: make reasonable choices, note them)
- Branch from the eval branch rather than `v1-full`, because the sample sheet needs `review.json` and the brief lives here. The PR target is decided later with Kirtan (the eval branch may merge first).
- Form email: Resend free tier from a Worker, not Cloudflare Email Sending (beta, paid plan). Kirtan can overrule at checkpoint 1 (question 12).
- The superpowers brainstorming skill was not run: the brief is the output of that step and says not to ask outside checkpoints.

## Open questions (collected for checkpoint 1)
See `checkpoint-1.md` once written.

## Design direction (notes for phase 2, from the teardown)
- Headline device = "shows its working": a real handwritten page carrying Gr8r's marks in examiner's red, the evidence highlight as the only proof visual, a "sent to you" margin slip for escalations, the "For examiner's use only" grid as the table form, a run receipt line of real figures.
- Avoid the category's serif-on-off-white default (all three education references use it); consider a single grotesk, black and white, red ink and highlighter as the only colours. Content width about 1150–1250px.
- No sticky floating CTAs on phone; no icon discs over tables.

## Later phases
- Phase 2 (after checkpoint 1): design direction, 2–3 rendered home-page first screens + sample-sheet section → checkpoint 2.
- Phase 3: build site (`site/`), pitch materials, campaign plan in full, privacy page, claims register → checkpoint 3.

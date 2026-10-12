# Pitch project: progress

Brief: [fable-brief.md](fable-brief.md). Branch: `pitch/website-and-campaign` (from `eval/cbse-science-first-run`, which holds the eval data). Orchestrator: Fable; subagents on Opus (anything a visitor reads or sees) or Sonnet (mechanical work).

## Status
- 2026-10-12: started. Phase 1 complete; checkpoint 1 answered (see `checkpoint-1.md`, Answers). Phase 2 done; checkpoint 2 answered (hybrid, Inter, Q35(a) on home, keep variants). Phase 3 (build) in progress.

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

## Phase 2: design direction (→ checkpoint 2)
- [x] Install skills: emilkowalski/skills (animation), vercel-labs web-design-guidelines (committed under `.agents/skills`)
- [x] Scaffold `site/` (Next 16 static export, configurable basePath, tokens, shared review components, static PageViewer, content modules)
- [x] Render answer-book pages for the sample (private preview only): `site/public/sample/pages/p{04,07,08,23,24,30}.webp`
- [x] Design brief → `design-brief.md`
- [x] 3 built home first screens + sample section (Opus builders in worktrees, merged into `/variants/v1..v3`), screenshots at 390 / 820 / 1440 via `site/scripts/screenshot.mjs` → `variants/`
- [x] Fresh Opus review + recommendation → `checkpoint-2.md`. **Waiting on checkpoint 2.**

## Phase 3 work started early (independent of the design choice)
- [x] Pitch materials → `materials/` (pilot offer, messages, deck outline, objections) (Opus)
- [x] Site copy drafts → `copy/` (long; trimmed when wired into content modules) per page (Opus, humanizer pass)
- [x] Target-list method and starter lists for Delhi NCR → `research/target-lists.md` (Sonnet)

## Facts learned from the builds (carry into the claims register)
- The run escalated 15 answers, not 4 (the brief's "four" was the count of unflagged wrong scores).
- Q35(a): reader dropped the "vasectomy" line as crossed out (0/1 vs the examiner's tick); c1 credited without the hormone being named; escalation reason was a page-break artefact. Q24(b) and Q21 are clean (Q21's transcript misreads one cancelled fraction, no mark depended on it).
- The second examiner scores first but sees the grader's marks in the same request: say "checks", never "independently".
- Hero answer: Q24(b), page 7.

## Phase 3: build (→ checkpoint 3)
- [x] Home page + `/sample` from the hybrid; shared site components in `site/components/site/`; content modules `home.ts`, `sample.ts`, `sample-marks.ts`, `claims.ts` (merged `5ccecb3`)
- [x] Pilot-form Worker in `site/worker/` (Turnstile + Resend + rate limit; 63 tests; not deployed; `CHANGE_ME` entries in `wrangler.jsonc`)
- [ ] Audience pages: schools, professors, investors
- [ ] How it works, pilot, privacy, about; results page hidden
- [ ] Claims register (`site/content/claims.ts` + `docs/pitch/claims-register.md`)
- [ ] Screenshots of every page at 390/820/1440, Fable's own review, fixes
- [ ] Lighthouse mobile per page; humanizer pass; fresh-reader checks per audience
- [x] Full campaign plan (`campaign-plan.md`, targets for 6 Dec 2026)
- [ ] CHANGELOG entry; PR

## PAUSED 2026-10-12 19:35, resume at 20:40 (usage limit)
State: branch `pitch/website-and-campaign` at the commit below, clean. Home and sample pages built and reviewed by Fable from the static build (`scratchpad/review1`; hero and marks correct; full-page shots show the criterion-row crops as blank yellow, scrolled shots were taken but not yet examined: `review1/home-scroll-{900,1700,3300}.png`).
Three page builders were launched and stopped before they wrote anything; their worktrees are removed. **On resume, relaunch exactly these three (Opus, worktree, same prompts as in the session; they are reproducible from this file):**
1. `/schools`, `/professors`, `/investors` from `docs/pitch/copy/*.md`; new types in `content/types-audience.ts`; reuse `CriterionRows` for Q24(b); FAQ as visible headings; commit `feat(site): schools, professors and investors pages`.
2. `/how-it-works`, `/about`, `/privacy`, `/results` (hidden, noindex); types in `content/types-info.ts`; privacy as Flint-style tables; `ReviewDesk` for Q21 on how-it-works; commit `feat(site): how it works, about, privacy and results pages`.
3. `/pilot` with the form wired to `site/worker` (fields from `worker/src/validate.ts`, Turnstile action `pilot`, env `NEXT_PUBLIC_PILOT_ENDPOINT` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, disabled state when unset, `.env.example`, end-to-end test against `wrangler dev` with `EMAIL_DRY_RUN=true`) + single-column hero on `/sample`; commit `feat(site): pilot page with the request form; single-column sample hero`.
Rules for all three: do not edit `types.ts`, `site.ts`, `layout.tsx`, `components/site/*`, `app/page.tsx`, `variants/`; verify with `npm run typecheck && npm run lint && npm run build`, serve `out/`, `scripts/screenshot.mjs` at 390/820/1440, web-design-guidelines pass; worktrees must start from `pitch/website-and-campaign` (they are created from master; `git reset --hard pitch/website-and-campaign` first).
Then: merge, build, Fable reviews every page from screenshots (and the scrolled shots), fixes; Lighthouse mobile per page (`npx lighthouse --chrome-path` to Playwright's Chromium); humanizer pass on the content modules; fresh-reader checks per audience (Opus); claims register from `content/claims.ts` into `docs/pitch/claims-register.md`; CHANGELOG entry; checkpoint 3.
Open items for checkpoint 3: founder backgrounds, contact email, domain + Cloudflare/Resend accounts, the CBSE material in public (team-written sample recommended), the first ten names.

## Later phases
- Phase 2 (after checkpoint 1): design direction, 2–3 rendered home-page first screens + sample-sheet section → checkpoint 2.
- Phase 3: build site (`site/`), pitch materials, campaign plan in full, privacy page, claims register → checkpoint 3.

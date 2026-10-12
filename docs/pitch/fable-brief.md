# Brief: Gr8r's website and first pitch campaign

You are leading this project for Kirtan, one of Gr8r's founders. It has two outputs that depend on each other: a public website for Gr8r, and the plan and materials to start pitching to schools, college professors and investors. You orchestrate: you make the judgment calls, hold the positioning and the design direction, and hand out research, page builds and reviews to subagents. Kirtan is available for decisions at three checkpoints (below) and otherwise wants you to keep going without asking.

Research behind this brief was done on 2026-10-12. Findings are summarised where you need them; anything marked *unverified* came from a single or secondary source and has to be checked before it appears on a public page or in a deck.

## Where things stand

Gr8r grades handwritten exam answer sheets. A teacher sets up an exam with questions and rubrics and uploads a student's scanned or photographed sheets. A vision model reads each page, a grader model scores each answer criterion by criterion with quoted evidence from the student's writing, an independent second model checks the grade, and anything the system can't decide is sent to the teacher instead of being guessed. Teachers can override any score with a reason, and every model call, version and teacher action is kept as an audit trail. Read `.claude/CLAUDE.md`, `README.md` and `docs/proposals/002-grading-v2-architecture.md` for the product, and `CHANGELOG.md` for what is built.

The team is very small and pre-revenue, and appears to be based in India. The web app works end to end. The pipeline's accuracy does not yet: the only run on a real paper (`docs/evals/cbse-x-science-2025/README.md`, on branch `eval/cbse-science-first-run`) is a smoke test that scored a model answer book 42/80, with most marks lost in page reading and filing, and four wrong scores that were not flagged. The team is fixing the pipeline and running more papers in parallel with this project. Kirtan has decided to pitch now and update the numbers as they improve. That decision is made; work within it.

What that means for you:

- Pitch on what is already true: evidence-quoted, criterion-level grading; a second examiner; escalation instead of guessing; teacher override; a full audit trail; a real 31-page answer book read and graded in about a minute for about 22 US cents in model costs; a choice of API or self-hosted open-weight models.
- Do not write an accuracy or agreement figure, a customer logo, a testimonial, a certification or a user count that the team does not have. Where a number will exist later, design the slot and leave it out of the published page until the number is real.
- Keep every claim, figure and piece of copy that will change in one typed content module per page, separate from layout, so the team can update results without touching components.
- The ask at this stage is a pilot or a design partnership, and the site should say so plainly. The research found no early-stage competitor with a limitations page; an honest "what it does well today, what it sends to you" section would stand out and suits this product.

## Who it is for, and what each should do next

Three audiences, in the order the site should serve them.

**Schools and coaching institutes.** The wedge is internal exams, unit tests, pre-boards and coaching mock tests. Stay away from board-exam marking: CBSE's 2026 on-screen marking rollout for Class 12 went badly in public (blurred scans, a vendor security row, a parliamentary summons), and the board said publicly that AI was not used. Parents and trustees may associate any "AI marking" with that, so scan quality, teacher sign-off and "nothing is published until a teacher approves it" need to be visible early. One consultancy source (*unverified*, treat as directional) says the principal decides at mid-market schools and a trustee or director at premium ones, cycles run four to nine months, budgets are set between October and February, and pilots need written success criteria and a conversion date. Objections to answer on the page: handwriting legibility, partial credit on the school's own marking scheme, Hindi and regional languages, cost per sheet, student data. Next step for this audience: request a pilot.

**College professors.** Realistic first users only for assessments they control: internal tests, quizzes, and courses at autonomous colleges. End-semester scripts belong to the Controller of Examinations and are bought by tender, which is out of reach for now. The pattern that worked for comparable tools is a few named instructors, one course each, AI marks compared with the instructor's own, results written up. Professors will care most about how the grading works and whether they can check it, so this audience gets the most depth on method. Next step: try it on one course.

**Investors.** Indian edtech funding is at multi-year lows (Inc42 counts $249M across 31 deals in 2025) and K-12 edtech is out of favour, so the framing is vertical AI for assessment with a human in the loop, not "edtech". Two YC W25 companies in this category raised on pilots alone. Investors at pre-seed look for a working product, design partners and evidence of a path to measured accuracy. Next step: a conversation with the founders; the site supports the deck, it doesn't replace it.

The positioning gap, from a survey of global and Indian competitors (Gradescope, CoGrader, Edexia, Eklavvya, Smartail DeepGrade, and 2025-26 Indian entrants): almost no Indian competitor publishes a price, a measured result with its method, or a real graded sheet a visitor can inspect. Gr8r can show its work today, and can publish its evaluation with method once the numbers are worth publishing. Don't name or criticise competitors on the site.

## What to produce

1. **Positioning**: one page that fixes the category headline, the one-sentence mechanism, the per-audience message and the proof available today. Everything else derives from it.
2. **The website**, built and deployed: a home page; one page each for schools, professors and investors; a "how it works" page; a sample graded answer sheet (see below); a pilot-request flow; a plain-language privacy and data page; an about page with the founders.
3. **Pitch materials**: a one-page pilot offer with success criteria and a conversion date; a first-contact message and a follow-up for each audience (principal or trustee, coaching centre head, professor, investor); an outline for a pre-seed deck with what each slide has to prove; a short objection-and-answer sheet for calls.
4. **A campaign plan** for the first eight weeks: who to approach first and why, how to build the target lists, the sequence of outreach, what to measure, and when to update the site with new results. The school budget window is open now, which argues for schools and coaching centres first.

Drafting outreach is in scope. Sending it is not; Kirtan sends.

## The sample graded sheet

This is the centrepiece and the reason for the stack choice. The strongest thing Gr8r can show is its own review screen on a real answer: the handwritten page beside the transcript, each criterion's score with the quoted evidence highlighted, both examiners' positions, and an answer that was escalated with the reason.

The pieces exist. In `frontend/components/features/review/`, `QuestionCard`, `ExaminerRounds` and `HighlightedText` are display components that take data as props and don't touch the API. `docs/evals/cbse-x-science-2025/runs/2026-10-11-gpt-4.1-mini/review.json` holds exactly the data they render. `PageViewer` fetches images from the API and needs a static variant.

Choose a few answers that show the product honestly: ones it graded correctly with clear evidence, and at least one it escalated. Don't present the run's total as a result.

One thing to settle with Kirtan before using this material publicly: the question paper, marking scheme and answer book are CBSE's documents, and the eval README says to keep the repository private while they are in it. Raise it at the first checkpoint, with the alternative of a sample the team writes and grades itself.

## Technical decisions already made

- **Next.js 16, as a separate `site/` app in this repo, built as a static export.** The team knows the stack, the shared components import directly, and a static export deploys without the backend. Astro was considered and is slightly lighter per page; it lost on adding a second toolchain for a two-person team. Check current Next.js docs for anything that post-dates your training (16.4 is current).
- **CSS Modules on the design tokens in `frontend/app/globals.css`**, no Tailwind and no block libraries (shadcn blocks, Magic UI, Aceternity and similar). The marketing site can extend the brand, but a visitor who goes from the site to the product should recognise it as the same thing.
- **Hosting on Cloudflare** (static assets are free; Vercel's free tier excludes commercial sites). The pilot-request form posts to a small Worker that sends email, with Turnstile against spam. The `wrangler`, `cloudflare`, `turnstile-spin` and `cloudflare-email-service` skills are installed.
- Work on a feature branch and open a PR; the repo's conventions are in `.claude/CLAUDE.md`. The eval data is on `eval/cbse-science-first-run`, not yet on `v1-full`.

## Design

Aim for the standard of the better YC company sites, not a template. Study these before proposing anything, in a real browser, at desktop and mobile widths:

- [edexia.com](https://edexia.com/): same category, four people. A working try-it hero, accuracy and research pages, minimal navigation.
- [frizzle.com](https://www.frizzle.com): handwriting shown in the hero, an FAQ built from teacher objections, a sub-processor list. Its headline is vague and its numbers unsourced; don't copy those.
- [flintk12.com/security](https://flintk12.com/security): student-data handling explained to a school in tables, not legalese.
- [greptile.com/benchmarks](https://www.greptile.com/benchmarks): how to publish an evaluation with method and caveats; the model for Gr8r's results page when it has results.
- [solveintelligence.com](https://www.solveintelligence.com/): restrained, plain headline, real product UI; the right tone for professors and investors.

What YC's own design reviews keep repeating, and what this site has to pass: a stranger can tell within seconds what this is and whether it is for them; the headline names the category in plain words; one primary call to action, above the fold; the page shows the product doing something real, large enough to read; spacing and type are finished to the point that the site itself reads as trustworthy; animation is used sparingly and to direct attention.

What reads as machine-made now and should be avoided: purple or two-colour gradients on headlines and buttons, glowing dark heroes, grids of icon-topped cards, coloured left borders, monospace "console" decoration, abstract hero art in place of the product. A large serif headline on warm off-white is the current alternative and is becoming a default of its own (nine of seventeen sites surveyed), so a typeface alone won't make this distinctive. The better sites each have one ownable device. Gr8r has an obvious candidate in its own subject matter: handwriting, examiner's marks, the quoted-evidence highlight. Find the device; don't decorate.

Use real product screenshots and code-rendered graphics. Don't generate hero illustrations.

Skills: `frontend-design` is installed; use it. Two others are worth considering and need Kirtan's go-ahead to install, since they run third-party code: Emil Kowalski's animation skills (`npx skills@latest add emilkowalski/skills`) for motion, and Vercel's `web-design-guidelines` (`npx skills add vercel-labs/agent-skills --skill web-design-guidelines`) as an accessibility and UX audit. Impeccable (`npx impeccable install`) is a capable critique-and-polish tool with a reported install bug as of late September; optional. Don't stack several style skills, and don't use `ui-ux-pro-max` for this: it picks palettes, which is the opposite of a direction.

## How to run the work

Hold the positioning, the design direction and the final review yourself. Delegate the rest: verification of the research claims, target-list research, competitor page teardowns, page builds once the direction and the shared components exist, drafting of pitch materials, and reviews. Give each subagent the goal, the audience, what is already decided and what done looks like; they have none of this context unless you pass it. Use a less expensive model for mechanical work and keep a strong one on anything a visitor will read or see.

Verify by looking. For every page, take screenshots at phone, tablet and desktop widths with the Chrome DevTools tools, read them, and fix what you see; run a Lighthouse audit on mobile and treat poor performance or accessibility scores as defects. Have a reviewer with fresh context, given only the screenshots, the positioning page and the YC tests above, critique each page before you call it finished. A reviewer that built the page will approve it.

Have the copy read by a fresh reader for each audience: could a principal with two minutes say what Gr8r does and what to do next? Run public copy through the `humanizer` skill's checks; copy that sounds generated undercuts a product whose pitch is trust.

Keep a short progress file in `docs/pitch/` and commit as you go, so the work survives a context reset and Kirtan can see where it stands.

## Checkpoints

Stop for Kirtan at these three points and nowhere else unless something is blocked.

1. **After positioning and before design.** Bring the positioning page, the site map, the campaign plan outline, and the questions only he can answer, in one batch: the founders' names and backgrounds; domain and contact address; what a pilot includes and whether it is free; the stance on showing pricing; whether the CBSE material can be shown publicly; whether a Hindi version is wanted at launch; who the first ten conversations are with.
2. **Design direction.** Two or three rendered versions of the home page's first screen and the sample-sheet section, built for real and screenshotted, with your recommendation.
3. **Before anything goes public.** Deploying, pointing a domain, and switching on the form's email all wait for his yes. Bring the built site on a preview URL or local screenshots, the pitch materials, and a list of every claim on the site with its source.

Between checkpoints, make reasonable choices, note them in the progress file and continue.

## Legal and factual care

India's Digital Personal Data Protection rules were notified in November 2025 and phase in; verifiable parental consent for under-18s and the main duties are reported to apply from about May 2027, with a narrow exemption for educational institutions' own educational activities (*unverified against the gazette text*). The privacy page should say in plain language what Gr8r stores, where, who can see it, which model providers process it, and that self-hosted models are an option. Write what is true of the product as built, flag that it needs a lawyer's review before the site makes any compliance claim, and make no certification claims.

Before a figure from this brief or from your own research goes on a public page or a slide, open the primary source. Market and competitor numbers here are mostly self-reported by the companies concerned.

## What done looks like

- A visitor from each audience can say what Gr8r is, see it work on a real answer, and take their next step, on a phone, on a slow connection.
- Every claim on the site is true today and traceable to a source in the repo or a cited document.
- The site passes the YC tests above in a fresh reviewer's judgment and doesn't show the machine-made tells.
- The team can update results by editing content files.
- Kirtan has the pilot offer, the messages, the deck outline and an eight-week plan he could start on the next morning.

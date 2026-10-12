# Design brief: Gr8r website

Status: phase 2 plan (2026-10-12). Three directions are built for real as `/variants/v1..v3` in `site/`, screenshotted at 390 / 820 / 1440, and one is recommended at checkpoint 2. The chosen direction then becomes the site's tokens and components.

## Subject, audience, job

The subject is the Indian exam answer book: ruled paper with a red margin, a column for the question number, blue-ink handwriting, an examiner's red ticks and marks, a marking scheme with points per criterion, the "For examiner's use only" grid on the cover. Gr8r's output lives in exactly that world: each mark cites a criterion and quotes the student's own words.

Audience in order: a principal or coaching-centre head with two minutes; a professor who wants to check the method; a pre-seed investor. The page's job: say what it is in seconds, show it working on a real answer large enough to read, and offer one next step.

## The device

**It shows its working.** Real handwriting is the only illustration. Three product-true marks are the only graphics:
1. the **evidence highlight**: a highlighter band on the student's words that earned a mark, the same band in the transcript and on the scan; it means "proof" and is used for nothing else;
2. the **examiner's marks**: ticks and criterion marks in red ink, drawn from the grade record, never decorative;
3. the **"sent to you" slip**: an escalation shown as a note clipped to the page, with its reason in the product's own words ("The two examiners disagree").

Each is backed by data from `review.json` (criteria, scores, evidence quotes, rounds). Positions on the scan are hand-placed for the sample (no bounding boxes exist) and kept in the content module, marked as such.

## Tokens

Colour, each with one meaning (product tokens where they exist):

| Name | Value | Meaning |
|---|---|---|
| paper | `#ffffff` (product `--color-surface`) with `#f8fafc` (`--slate-50`) for sections | background; the page is paper |
| ink | `#0f172a` (`--slate-900`), muted `#475569` (`--slate-600`) | text |
| rule | `#e2e8f0` (`--slate-200`) | borders, the ruled lines |
| action | `#4f46e5` (`--indigo-600`), hover `#4338ca` | the one call to action, links; the product's button colour, so the site and the app match |
| examiner red | `#b91c1c` (`--red-700`) | examiner's ticks and marks on paper only; never a UI colour, never an error colour on this site |
| highlighter | `#fef08a` (`--evidence-bg`) | quoted evidence only |
| second examiner | `#0f766e` (`--teal-700`) | the evaluator's position, as in the product |

No gradients, no shadows beyond the product's `--shadow-sm`, no dark sections, no icon tiles.

Type: one family for the site, Inter stays inside embedded product panels (they are the product).
- **v1 and v2: Inter** throughout (continuity with the product; the device carries distinctiveness).
- **v3: Atkinson Hyperlegible Next** for the site's own text, Inter inside product panels. A face designed for legibility on a product that reads handwriting is a reasoned choice, not a mood; it must be judged on the screenshots.

Scale (from the product's, extended upward): body 1rem/1.6; lede 1.25rem; h2 1.75rem; h1 2.5rem at phone, 3.5rem at desktop, weight 600, letter-spacing -0.02em, max 18 words. Measure 60–70 characters. Sentence case everywhere; no all-caps labels; no eyebrows; no numbered markers unless the content is a sequence (the pipeline steps are; the audiences are not).

Layout: content width 1200px, 16px gutter at phone, 24px at tablet, left-aligned text, a 12-column grid at desktop. Nav: five text links and one indigo button. One primary CTA per page, repeated once at the end.

Motion: one moment only, on the first screen: the evidence highlight and its criterion line appear in sequence after load (about 1.2s total, `prefers-reduced-motion` shows the final state). No scroll-reveal sections, no hover lifts on cards.

## The three variants

All three use the same copy from `positioning.md`:
- h1: "AI marking for handwritten answer sheets. It shows its working."
- lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student's answer as evidence, has a second model check the grade, and sends anything it can't settle to the teacher instead of guessing."
- primary CTA "Request a pilot"; secondary link "See a graded sheet".
- the run line, as a sentence under the hero: "One real 31-page answer book: read and graded in about a minute, for about 22 US cents in model costs. Four answers sent to the teacher." (figures from the eval README; the last figure is a slot and should be wired to the content module, not typed into the component).

Sample-sheet section (same in all three, laid out differently): Q35(a) from the real run (pages 23–24): the scan beside the transcript, five criteria with scores and quoted evidence highlighted, the three examiner rounds (grader 3 → 3.5 → 4 of 5, evaluator 3.5 → 4 → 4), finishing at 4/5; plus Q21 (page 4) as a short second example; plus one escalated answer rendered honestly: because the run's escalations are all bugs, the variant shows what an escalation looks like using Q24(a) ("Not attempted", a real choice-group outcome) and a slip for a *hypothetical* "The two examiners disagree", clearly labelled as an illustration in the caption. The total of the run is never shown.

### v1: The examined page
```
┌──────────────────────────────────────────────────────────────┐
│ Gr8r      Schools  Professors  Investors  How it works  Sample  [Request a pilot] │
│                                                              │
│  AI marking for handwritten       ┌───────────────────────┐  │
│  answer sheets.                   │  real scan, page 23    │  │
│  It shows its working.            │  ──highlight band──    │  │
│                                   │   ✓ 1/1  (red, margin) │  │
│  lede (60ch)                      │  ──highlight band──    │  │
│  [Request a pilot]  See a sheet   │   ✓ 1/1                │  │
│                                   │  ┌ sent to you ┐       │  │
│  run line                         └───────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```
Hero is the scan at ~55% width, headline left. Marks are overlaid on the scan (absolute-positioned SVG ticks and a margin mark, hand-placed from the grade). Sample section: the product's `QuestionCard` under the scan, full width, the evidence highlighted in the transcript.

### v2: The review screen
```
┌──────────────────────────────────────────────────────────────┐
│ nav                                                          │
│  AI marking for handwritten answer sheets. It shows its working. │
│  lede                     [Request a pilot]  See a sheet     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ scan (page 23)      │ QuestionCard: criteria, evidence,  │ │
│ │ StaticPageViewer    │ highlighted transcript, 2 examiners │ │
│ └──────────────────────────────────────────────────────────┘ │
│  run line                                                    │
└──────────────────────────────────────────────────────────────┘
```
Headline above, then the real review screen (scan + `QuestionCard` + `ExaminerRounds`) at full width, in the product's own chrome. Maximum continuity with the app; the risk is that it reads as "a screenshot" rather than a designed page, so the panel must be large and the page around it very quiet.

### v3: The answer book
```
┌──────────────────────────────────────────────────────────────┐
│ nav                                                          │
│ ║ Q.No ║  AI marking for handwritten answer sheets.          │
│ ║      ║  It shows its working.                              │
│ ║      ║  lede                                               │
│ ║      ║  [Request a pilot]                                  │
│ ║──────║──────────────────────────────────────────────────── │
│ ║ 35(a)║  scan crop (3 lines) ──highlight──  ✓ 1/1   ...     │
│ ║      ║  criterion text                                     │
│ ║──────║──────────────────────────────────────────────────── │
│ ║ For examiner's use only: Q.No | Marks | Sent to teacher    │
└──────────────────────────────────────────────────────────────┘
```
The page itself is laid out as an answer book: a red double margin at the left with the question-number column, faint ruled lines behind the sample section only, the "For examiner's use only" grid as the table form for results and pilot terms. Atkinson Hyperlegible Next. The boldest; must not become theme-park. If the ruled lines fight the text, drop them and keep only the margin and the grid.

## Review against the generic defaults (frontend-design skill)

- Warm cream + serif + terracotta: not used; paper is plain white, type is a sans, accent is the product's indigo.
- Dark hero with acid accent: not used.
- Broadsheet hairlines and zero radius: v3 flirts with rules; its rules are the answer book's, not a newspaper's, and the product's radii stay.
- SaaS card kit: no cards except the product's own `QuestionCard`; audience sections are text, not three tiles.
- Template chrome: no eyebrows, no middle-dot meta strings, no arrows on links, no mono labels (the product's mono for criterion ids stays inside the product panel).

## Quality floor for every variant
Phone 390 without horizontal scroll; h1 readable on phone; CTA above the fold at 390×844; keyboard focus visible (product's `:focus-visible`); `prefers-reduced-motion`; contrast AA; scan `<img>` with width/height and `alt` describing the page; no layout shift from the font (use `display: swap` with size-adjusted fallback or `optional`).

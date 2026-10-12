# Checkpoint 2: design direction

Three directions for the home page's first screen and the sample section were built for real in `site/app/variants/v1..v3` and screenshotted from the static build at 390, 820 and 1440. First screens and downscaled full pages are in `docs/pitch/variants/`. To see them live: `cd site && npm install && npm run dev`, then `/variants/v1/`, `/variants/v2/`, `/variants/v3/`.

All three use the same copy (headline, mechanism sentence, CTAs, run line) and the same real answers from the CBSE run (Q35(a), Q21, Q24(a)). They differ in the device and the layout.

| | v1: the examined page | v2: the review screen | v3: the answer book |
|---|---|---|---|
| First screen | Headline left; the real scan of page 23 at half width with Gr8r's marks drawn on it (highlighter bands on the quoted evidence, red tick and mark per criterion in the margin) | Headline across the top; the product's own review screen below it at full width (page viewer beside the answer card with criteria, highlighted transcript, examiner rounds) | The page laid out as an answer book: red double margin with a question-number column, headline in the writing area; Atkinson Hyperlegible Next instead of Inter |
| Sample section | The product's answer card beside the page viewer, then Q21, then "what it sends to you" | Same desk, with the three examiner rounds in a full-width panel | Each criterion as one row: a crop of the handwriting with its highlight, the mark in the margin, the criterion's text; then the three rounds; then a "For examiner's use only" grid as the results table |
| Strength | The marked page says what the product does before the headline is read; most distinctive first screen | Most product-true; interactive (page switching, quote-to-transcript); a visitor who later opens the app recognises it | The clearest explanation of "shows its working": one crop, one highlight, one mark, one criterion per row; the grid is instantly familiar to Indian teachers |
| Weakness | The hero's "sent to you" slip shows a reason that is a known bug of the run; one criterion's evidence turns a third of the page yellow; headline runs to four lines at 1440 | The most coloured thing on the first screen is the run's "Several attempts" warning; least distinctive; long before the run line | The hero leaves the right half empty at 1440; the three-round section is very long; the grid is cramped at 390 |

## My recommendation

**v1's first screen, v3's criterion rows as the home page's sample explanation, v2's full desk as the `/sample` page.** Concretely:
- Hero: v1's layout, minus the slip (escalation is shown further down, honestly), with **Q24(b) on page 7 as the hero answer instead of Q35(a)**: two criteria, two quotes that match the handwriting, 2/2, the second examiner agreed first time, and 24(a) "not attempted" shows the choice group. The headline at 3rem so it holds to three lines at 1440.
- Under the hero: v3's criterion rows (mark in the margin, crop of the handwriting with the highlight, the criterion in plain words, one-line reason) for Q24(b), then Q21 (the numerical one). Internal terms ("c1", "Choice group g35", "agreement 79%") never appear outside the product panel.
- Then Q35(a) as **"What it got wrong, and what happened next"**: the reader took the "vasectomy" line as crossed out (0/1 against the examiner's tick), credited the first criterion without the hormone being named, and the answer reached the teacher. That is the honest section made concrete, placed after the clean examples, not before.
- "What it sends to you": the slip form from v1, with the illustration label, and Q24(a) "not attempted".
- `/sample`: v2's desk (page viewer, answer card, all three rounds), which is the product and belongs on the page a professor opens.
- Typeface: **Inter** throughout (one family, continuity with the product). Atkinson Hyperlegible Next (v3) is the alternative if you want the site to have its own voice; it read well in the screenshots, and its story (a face designed for legibility, on a product that reads handwriting) is honest. Your call; I lean Inter.
- The answer-book margin from v3 is not carried to the site chrome; it stays as the form of the sample rows and the results grid only.

## What the three builds surfaced (fixed or to fix regardless of direction)
- The run line said "Four answers sent to the teacher"; the run escalated fifteen. Fixed in the brief; the variants' copy constants still say four or fifteen and will be unified in the content module.
- Q35(a) is not a clean example: the reader took the "vasectomy" line as crossed out, so the record gives 4/5 where the examiner's tick says 5/5, and the run's escalation reason for it is a page-break artefact. Every variant now says so in a note. The site will present it as what it is: a real grade with one reading error that the teacher fixes in review. A team-written sample (checkpoint 1, question 7) remains the cleaner long-term answer.
- The product's own answer card shows per-answer figures ("agreement 100%", "confidence 95%"). They are the product's UI on real data, not a claim about accuracy. I propose to keep them on `/sample` and crop them out of the home page.
- Shared fixes applied: Turbopack alias paths, React types path, the page viewer's "of 2" count, per-page alt text, duplicate ids, the header's links and button.

## Fresh reviewer (Opus, given only the screenshots, the positioning page and the YC tests)

Ranked v1 first for a principal on a phone (the only one that shows a marked sheet without scrolling), v2 first for a professor on a desktop (the question, score, reason and transcript are on the first screen), and v3's criterion rows as the clearest explanation of "shows its working". Recommended v1's first screen with v3's sample section, the sticky-note slip removed, the three rounds reduced to a sentence on the home page with the full desk on `/sample`, and Q21 leading the samples with Q35(a) framed openly as what went wrong. That matches my recommendation; I go further by leading with Q24(b), which is cleaner than Q21 visually.

Defects it found that are fixed before anything is shown: `TODO@example.com` and "Gr8r · Graider" in the footer; "Page 23 of 2" (fixed in the viewer); the run line disagreeing between variants (fifteen is right); internal terms on the page; the grader crediting Q35(a)'s first criterion without the hormone being mentioned (which is why Q35(a) moves to the honest section); the slashed zero in Atkinson reading as "Ø/1" (one more reason for Inter); v3's tables clipped at 390.

## What I need from you
1. **The direction**: the hybrid above (v1 hero, v3 rows, v2 desk on `/sample`), or one variant as built.
2. **Typeface**: Inter (my lean) or Atkinson Hyperlegible Next.
3. **Q35(a) on the home page** as "what it got wrong, and what happened next", or only on `/sample`. I recommend the home page: the honest section is the positioning, and a real example is worth more than a paragraph.

Everything else in the list above I'll do without asking. After your answer: the chosen direction becomes the site's shared components and tokens, the content modules get the copy drafts, and the other pages are built on it.

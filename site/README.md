# Gr8r marketing site

Static Next.js 16 site (App Router, TypeScript, CSS Modules, no Tailwind). It reuses the product's design tokens and a few product components so it looks like the same product.

## Run

```bash
cd site
npm install
npm run dev          # http://localhost:3000  (npm run dev -- -p 3100 for another port)
npm run typecheck
npm run lint
npm run build        # static export to site/out
```

Screenshots at 390, 820 and 1440 from a served build:

```bash
npm run build && (cd out && python3 -m http.server 3110 &)
node scripts/screenshot.mjs http://localhost:3110 ../tmp/shots / /sample/ /variants/v1/
```

The build needs network access once: `next/font/google` downloads Inter.

## basePath

The site may first be hosted under a sub-path such as `/graider`. Set it at build time:

```bash
NEXT_PUBLIC_BASE_PATH=/graider npm run build
```

Empty (the default) means the domain root. `next/link`, `<Link href="/schools/">` and the router add the base path themselves. For anything Next does not rewrite (a plain `<img src>`, CSS `url()`, a download link) wrap the path in `withBase()` from `lib/base.ts`:

```tsx
import { withBase } from "@/lib/base";
<img src={withBase("/sample/pages/p04.png")} alt="..." />
```

Always give `withBase` a root-relative path (`/sample/...`). Absolute URLs pass through unchanged.

## Content lives in `content/` only

Every word of copy sits in a typed module under `content/`: `home.ts`, `schools.ts`, `professors.ts`, `investors.ts`, `how-it-works.ts`, `sample.ts`, `pilot.ts`, `privacy.ts`, `about.ts`, plus `site.ts` (name, company, city, nav, CTA labels, contact email) and `claims.ts`. Types are in `content/types.ts`. Components and pages import these modules and must not hold copy of their own. Anything marked `TODO copy` is a placeholder.

`claims.ts` lists every factual claim the site makes with its `source` (a repo path or a URL). Add the claim there before using it in copy. Never put an accuracy figure, customer name or certification in copy without a claim behind it.

Designed pages use typed section shapes from `types.ts`, general enough for any page: `PageMeta`, `Hero`, `Figure`, `RunLine`, `Para` (a paragraph with an optional bold lead-in), `ProseSection`, `AnswerRows` / `CriterionRowsSection` (answers as answer-book rows, by question label), `StepsSection` (a real sequence only), `SlipContent`, `ReasonsSection`, `AudiencesSection`, `HonestSection`, `ClosingCta`, `ExaminerGridContent`, `DeskSection`. A page module composes them (`HomeContent` in `home.ts`, `SampleContent` in `sample.ts`); the other pages still use the placeholder `PageContent`. `site.ts` also holds the footer line, the phone menu label, the skip link and the words the shared components put around the sample data (`labels.rows`, `labels.desk`). `contactEmail` is hidden in the footer while it starts with `TODO`.

`sample-marks.ts` holds what is hand-placed on the scans: the home page's highlight bands and margin marks (Q24(b), page 7), the crop windows and bands for every answer row, and the alt text of each page and crop. Positions are percentages of the 1348 x 954 page images; re-place them if the images change. Scores, points and reasons always come from the sample data.

## Shared components (`components/site/`)

| Component | What it renders |
|---|---|
| `Header`, `Footer` | Site chrome (root layout). The header must stay a direct child of `<body>`: the variants hide it with `body:has(...) > header`. |
| `ExaminedPage` | A scan with hand-placed highlight bands and red margin marks drawn from the grade record; the page's one load animation (bands, then marks, about 1.2 s; final state under reduced motion). |
| `CriterionRows` (+ `ScanCrop`) | One answer as answer-book rows: mark in the margin, a crop of the handwriting with its highlight, the point in words, the model's one-line reason, optional notes. Not-attempted answers show a status instead of rows. |
| `ReviewDesk` | The product's review desk, read-only: `StaticPageViewer`, the product `QuestionCard`, and optionally the `ExaminerRounds` in a full-width panel. Client component. |
| `Slip` | The "sent to you" slip, always with a caption saying it is an illustration. |
| `RunLine` | The one sentence of measured fact under a hero. |
| `ExaminerGrid` | The "For examiner's use only" table (not used on a page yet). |
| `Prose` (`Paras`, `MoreLink`), `page.module.css` | Paragraphs, section links, and the shared page layout (containers, sections, headings, buttons, lists). |

## Design variants

`app/variants/v1..v3` and `components/variants/**` are the three checkpoint-2 directions, kept routable (not linked, `noindex`) for later mixing. Do not edit them; copy code out into `components/site/`. The chosen direction (checkpoint 2) is v1's first screen, v3's answer rows and v2's review desk on `/sample`, in Inter.

## Sharing product components

The site imports components straight from `../frontend` through the `@product/*` alias (`tsconfig.json`: `@product/*` -> `../frontend/*`):

```tsx
import QuestionCard from "@product/components/features/review/QuestionCard";
import { cn } from "@product/lib/utils";
import type { QuestionReview } from "@product/types/review.types";
```

Verified in a static build: `HighlightedText`, `ExaminerRounds`, `QuestionCard`, `ui/Button`, `ui/StatusBadge`, `types/review.types` and `lib/utils` (which only wraps `clsx`, no axios). How it works:

- `tsconfig.json` also maps `@/*` to `./*` first and `../frontend/*` second, because the product files import each other as `@/components/...`, `@/lib/utils`, `@/types/...`. Do not create a file in `site/` with the same path as a product file you rely on (for example `site/lib/utils.ts` or `site/components/ui/Button.tsx`), or it will shadow the product one for every product file.
- `next.config.ts` sets `turbopack.root` to the repo root so Turbopack accepts files outside `site/`, and `turbopack.resolveAlias` pins `react`, `react-dom`, `clsx` and `lucide-react` to `site/node_modules` (alias paths are relative to `site/`, not to the root: `./node_modules/<name>`). Without that, product files would load their own copy of React from `frontend/node_modules` (broken hooks, and no `frontend/node_modules` on a fresh checkout).
- Only import product files that render from props. Anything that calls the API (`@/lib/api`, `@/services/*`, contexts) will pull axios and cookies into the bundle: do not use it. `PageViewer` is the example: it fetches page images with the teacher's token, so the site has its own `components/sample/StaticPageViewer.tsx`, a copy with the same markup and classes that takes plain image URLs (`pages`, `page`, `onPageChange`, `captions`, `flagged`). If the product `PageViewer.tsx` or its CSS changes, copy the markup/CSS changes over by hand.
- Product components that take callbacks (`QuestionCard`) are client components. Use them from a client component or a page marked `"use client"`; they still prerender to static HTML.
- Product tokens: `app/globals.css` is a copy of `frontend/app/globals.css` plus a `site` section at the end for marketing-only tokens. When the product tokens change, re-copy the file above the `site` section.

If this alias approach ever breaks, the fallback is to copy the needed files into `site/product/` with a sync script. It has not been needed.

## Sample data

`content/sample-data/review.json` is a trimmed copy of a real review response: `docs/evals/cbse-x-science-2025/runs/2026-10-11-gpt-4.1-mini/review.json`. It keeps only the questions labelled 21, 24(a), 24(b), 25, 35(a) and 39(a)-(b), the `pages` metadata, and `unassigned_segments: []`. `submission` is reduced to `{ total_score: null, max_score: 80, status: "NEEDS_REVIEW" }` and `student_name` is null.

`lib/sample.ts` loads it as `SubmissionReview`/`QuestionReview` data (`sampleReview`, `sampleQuestions`, `sampleQuestion(label)`).

To update it, regenerate from a newer run: copy the new `review.json`, filter `questions` by label, replace `submission` and `student_name` as above, and keep nothing with file paths or timestamps at the submission level. Page images go in `public/sample/pages/` (`p04.png` and so on) and are referenced with `withBase("/sample/pages/p04.png")`.

## Layout

```
app/                 routes (one folder per page; variants/v1..v3 are the kept design variants)
components/site/     shared site components (see above)
components/layout/   PlaceholderPage (pages not designed yet)
components/sample/   StaticPageViewer
components/variants/ the three design variants (do not edit)
content/             all copy, typed (types.ts), sample-marks.ts, sample-data/
lib/                 base.ts (withBase), sample.ts
public/sample/pages/ page images for the sample
```

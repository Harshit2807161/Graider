# Site map

Status: draft for checkpoint 1. Static Next.js export in `site/`, hosted on Cloudflare. Every page's changeable content (claims, figures, copy) lives in one typed content module per page (`site/content/<page>.ts`), separate from layout.

Primary CTA across the site: **Request a pilot** (schools) on the home page; each audience page has its own single CTA.

| Route | Job | Primary CTA | Content module holds |
|---|---|---|---|
| `/` | A stranger learns what Gr8r is and whether it's for them in seconds; sees the product on a real answer; picks their audience | Request a pilot (secondary: see a graded sheet) | headline, mechanism, three audience cards' copy, proof strip, the honest section, the sample excerpt chosen |
| `/schools` | Principal or trustee with two minutes: unit tests and mock tests, their marking scheme, teacher sign-off, scan quality, cost, student data; objections answered | Request a pilot | audience copy, objections FAQ, pilot offer summary |
| `/professors` | Depth on method; how to check a mark; override; open-weight option; comparison on one course | Try it on one course | audience copy, method detail, FAQ |
| `/investors` | Framing (vertical AI for assessment, human in the loop), what exists, what's measured, the ask | Talk to the founders | thesis, what exists, what's next, contact |
| `/how-it-works` | The pipeline step by step with real screenshots; escalation reasons; audit trail; models; the honest section in full | See a graded sheet | step copy, escalation reasons, model list, limitations |
| `/sample` | The centrepiece: the review screen on real answers, statically rendered: page image beside transcript, criteria with quoted evidence highlighted, both examiners, one escalated answer with its reason | Request a pilot | the chosen answers (data from `review.json` or the team's own sample) and their captions |
| `/pilot` | The pilot offer (what's included, success criteria, conversion date) and the request form (Worker + Turnstile + email) | Submit | offer text, form fields, success copy |
| `/privacy` | Plain-language data page in tables: what is stored, where, who sees it, which providers process it, retention, self-hosted option; flagged for lawyer review; no compliance claims | (none) | tables' rows |
| `/about` | Founders, where the company is, why this product, contact | Contact | founders' names and backgrounds, address |
| `/results` | **Not published at launch.** Slot for the evaluation with method and caveats (Greptile-style) once a hand-marked comparison exists | — | the results module (empty = page hidden) |

Navigation: Schools · Professors · Investors · How it works · Sample · About, plus one button: Request a pilot. Footer: Privacy and data, contact, GitHub if the repo is public (it can't be while the CBSE PDFs are in it; see checkpoint 1).

Open at checkpoint 1: domain; Hindi version (adds `/hi/...` or a toggle, affects content-module shape); whether `/sample` uses the CBSE answer book or a team-written sample.

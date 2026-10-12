# Results (`/results`)

Status: **not published at launch.** The page is hidden while its results module is empty. This file holds its shape: the count tags, the method in prose, the columns of the case table, and the sentence that stands in for the figures.
Audience: professors, heads of department and investors who want to know how often Gr8r's marks match a teacher's, and how that was measured.
Primary CTA: none. This page is a report, not a pitch.

## H1

How Gr8r's marks compare with a teacher's

## Lede

This page will report how Gr8r's marks compare with marks given by hand, on real answer books, with the method and every case. No figure is published here until a comparison against hand-marked answer books exists.

Count tags (under the lede, filled from the results module):
[n] answer books · [n] pages · [n] answers · [month year]

---

## Section 1. Overview

Heading: Overview

Body (template):
We ran [n] handwritten answer books through Gr8r and compared each answer's mark with the mark a teacher gave by hand, using the same marking scheme. Gr8r ran with [models], at its standard settings, with no changes made for these answer books. [Sentence on where the answer books come from and how a reader can get them, if they are public.]

---

## Section 2. Method

Heading: Method

Body:
**The answer books.** We use answer books whose marks we can check: books marked by hand by a teacher for this comparison, and published sets that come with per-question marks. A model answer alone can't show over-marking, so we include mid-scoring and untidy scripts.

**The teacher's marks.** A teacher marks each answer by hand against the marking scheme, before seeing Gr8r's marks. Where the source gives marks already, we use them and say so.

**Gr8r's run.** Each book is uploaded as any school would upload it. The models, settings and code version are recorded with the run and listed here. Nothing is tuned on these books.

**What we count.** Every answer falls into exactly one group:
- *Matched:* Gr8r's mark is within [tolerance, to be fixed before the run, for example the same mark or within half a mark] of the teacher's, and the answer was not sent to the teacher.
- *Sent to the teacher:* Gr8r didn't settle the answer and gave a reason. We report how many, the reasons, and whether each reason was sound.
- *Wrong without a flag:* Gr8r settled the answer, and its mark is outside the tolerance. For a school this is the group that matters most, so it gets its own figure and its own column and is never folded into an average.

**Caveats, in plain words.** The run was done on [date]. Models and Gr8r both change, so later runs may differ, and we'll date every update. We ran this evaluation ourselves; no one outside checked it. With [n] answers, small differences between runs mean little.

---

## Section 3. Results

Heading: Results

Placeholder text while the module is empty:
No figure is published on this page until a comparison against marks a teacher gave by hand exists.

Template, when there are results:
One sentence with every number: [n] answers in total; [n] matched; [n] sent to the teacher, of which [n] for a sound reason; [n] wrong without a flag. Absolute counts first, percentages after them in brackets, no relative comparisons.

Then the same four counts by question type: multiple choice, short answer, long answer, calculation, drawing.

---

## Section 4. Every answer

Heading: Every answer

Intro (template): Every answer in the comparison, including the ones Gr8r got wrong. Each row links to the page image and to Gr8r's full record for that answer: criteria, quotes, both examiners' rounds.

Case table columns, in order:

| Column | What it holds |
|---|---|
| Answer book | Which book (and its source) |
| Question | The paper's label, e.g. 21 or 35(a) |
| Type | Multiple choice, short answer, long answer, calculation, drawing |
| Marks | What the question is worth |
| Teacher's mark | The hand-given mark |
| Gr8r's mark | Gr8r's proposed or final mark |
| Difference | Gr8r's mark minus the teacher's |
| Sent to the teacher? | Yes or no, and the reason shown to the teacher |
| Reason sound? | For answers sent to the teacher: was the reason right? |
| Wrong without a flag? | Yes when Gr8r settled the answer outside the tolerance |
| Record | Links: page image, grade record |

On a phone, each row becomes a card with the same fields.

Run details (under the table): models for each step, settings, code version, date, total model cost and time, each with its source.

---

## Claims used

- No figure until a hand-marked comparison exists: `docs/pitch/positioning.md` ("What we do not say"); `docs/pitch/site-map.md` (`/results`)
- Shape borrowed from Greptile's benchmark page (count tags; overview, method, results, case library; written definition of success; date-and-decay caveat; losses shown; no pitch): `docs/pitch/research/reference-sites.md` §4 and "Candidate devices" 5
- Unflagged wrong marks counted as their own column: `docs/pitch/research/reference-sites.md` §4 ("Avoid") and device 5
- Hand-mark first, then change one thing at a time; add mid-scoring, messier scripts; teacher-marked sets with per-question marks exist: `docs/evals/cbse-x-science-2025/README.md` ("What this says about the product" point 5)
- Runs record models, settings and code version: `docs/audit-trail.md` (config snapshot, git SHA)

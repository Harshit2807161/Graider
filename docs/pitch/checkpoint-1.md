# Checkpoint 1: what Kirtan needs to decide

Please answer in any form; short answers are fine. The ones marked **blocks** stop a page from being built.

## Facts only you have
1. **Founders** (blocks `/about` and the investor page): names, roles, one-paragraph backgrounds each, photos or not, LinkedIn or GitHub links to show. Who are the "team" in the brief's "very small team"?
2. **Company**: legal name and entity (if any), city, and whether the site should say "based in <city>, India".
3. **Domain and contact address** (blocks deploy and the pilot form): which domain (owned or to buy), the email address pilot requests should go to, and whether Kirtan already has a Cloudflare account.
4. **The first ten conversations**: names or at least types (which coaching centres, which schools, which professors), and which are warm introductions. This sets week 1 of the campaign.

## Decisions
5. **The pilot** (blocks `/pilot`): what it includes (how many exams, classes, sheets; how long), whether it is free, what we ask of the school (a teacher's time to review, scanned sheets, a marking scheme, feedback), and the conversion date / what happens after. My proposal if useful: free, one exam for one class (up to about 200 sheets), four weeks, two teacher reviews of our results, a written success criterion agreed up front (e.g. "teachers accept ≥ X% of marks without change; time per sheet under Y minutes"), and a paid-or-stop decision at the end.
6. **Pricing stance**: show nothing; show "pilots are free, pricing per sheet after"; or show a number. The research found almost no Indian competitor publishes a price, so a number would stand out, but it commits you. My recommendation: say pilots are free and that pricing is per sheet, with no number yet.
7. **The CBSE material in public** (blocks `/sample`): the question paper, marking scheme and the model answer book are CBSE's documents, and the eval README says to keep the repo private while they are in it. A second problem surfaced in the data: **none of the 15 escalations in the real run has an honest reason** (each is a mis-filing or the evidence-check bug the backlog describes), so the run can't supply the "one escalated answer with its reason" the sample needs. The one real examiner disagreement (Q35(a), three rounds, 3→3.5→4 of 5) is excellent material but was escalated for a wrong reason. Options: (a) show a few correctly graded CBSE answers (21, 24(b), 25, 39(a)-(b)) with attribution to CBSE's published model answer, and present Q35(a) as a graded answer with the examiners' discussion; (b) the team writes and handwrites a short sample exam (3–5 questions, including one answer that will genuinely escalate, e.g. a blank question or a messy one), hand-marks it, and runs it through Gr8r; that becomes the public sample and the demo; (c) (a) now, (b) when ready. My recommendation: (b), because it's the only sample that is both honest and ours; (a) for the demo deck only if you're comfortable. Also: can the GitHub repo be public, or does the site link to no repo? (The site's own code could live in a separate public repo.)
8. **Hindi at launch**: a Hindi version of the site (adds a second content module per page and a language toggle), or English only at launch with Hindi later? My recommendation: English only now; add Hindi for the schools page once the first Hindi-medium conversation happens.
9. **Hindi and regional-language answer sheets**: has Gr8r been tried on any Hindi handwriting? If not, the site says "untested".
10. **Skills to install** (they run third-party code): Emil Kowalski's animation skills and Vercel's `web-design-guidelines` audit. Yes or no to each. Not needed to start.
11. **Tone check**: the headline "AI marking for handwritten answer sheets. It shows its working." (see `positioning.md`). Keep, or prefer an alternative?

## For your review (no decision needed unless you disagree)
- `positioning.md`: category, headline, mechanism, per-audience message, proof we can show, what we won't say.
- `site-map.md`: pages, each page's job and CTA.
- `campaign-plan.md`: eight-week outline, schools and coaching first.

# Checkpoint 3: before anything goes public

Status: 2026-10-12. The site is built and reviewed; nothing is deployed, no domain is pointed, the form's email is off. All of that waits for your yes.

## What to look at
- **The site, locally:** `cd site && npm install && npm run build && npx serve out` (or `npm run dev`), then open `/`, `/schools/`, `/professors/`, `/investors/`, `/how-it-works/`, `/sample/`, `/pilot/`, `/privacy/`, `/about/`, and the hidden `/results/`. The three design variants are still at `/variants/v1..v3`.
- **Screenshots at 390/820/1440** of every page from the build are in the session's scratch folder; the comparison set for the variants is in `docs/pitch/variants/`.
- **Pitch materials:** `materials/pilot-offer.md`, `materials/messages.md`, `materials/deck-outline.md`, `materials/objections.md`.
- **Campaign:** `campaign-plan.md` (eight weeks, targets for 6 December 2026) and `research/target-lists.md`.
- **Every claim on the site with its source:** `claims-register.md` (114 verified; the 31 that went further than their source have been reworded; 18 policy promises for you to approve, listed there).
- **Founders:** `founders.md`; what the about page shows is in `site/content/about.ts` (`showCurrentRoles` decides whether employers are named).

## Quality checks done
- Lighthouse, mobile, from the static build: accessibility 100 and best practices 100 on every page; SEO 100 (results page 60 by design, it is `noindex`); performance 78–90 (text-only pages 90; the floor is the stack on simulated slow 4G; hero image, lazy crops and font loading fixed).
- Fresh readers (Opus, screenshots only): a principal, a professor and an investor all passed the two-minute test on what Gr8r does. Their biggest trust gaps: the missing contact email, the second examiner not being blind (now in the backlog as a product recommendation), and no time-saved or price figure (none exists; the pilot measures time).
- Humanizer pass on every content module; sentence case, British spelling, no em dashes, no AI vocabulary.
- Form tested end to end against a local Worker: validation, failure, success and the no-env state.

## What I need from you

**Blocks going public**
1. **The CBSE material.** The site shows pages 4, 7, 23 and 24 of CBSE's published model answer book, CBSE's question text and marking-scheme points reworded by Gr8r. Options: (a) publish as is, with attribution (the pages carry a caption; add a line crediting CBSE); (b) replace with a sample the team writes, handwrites, hand-marks and runs through Gr8r (the content modules and `sample-marks.ts` are built so the swap is a data change). My recommendation stands: (b) before public launch; (a) is defensible for private previews and demos. The campaign plan needs the public sample by week 3.
2. **Domain, Cloudflare account, Resend account.** The deploy steps are in `site/worker/README.md` and `site/README.md`. If the site goes under `kirtanjain.com/graider` first, build with `NEXT_PUBLIC_BASE_PATH=/graider`.
3. **Contact email** (`site/content/site.ts`, `contactEmail`): the about, investors and pilot pages show "Contact details are on their way" until it is set. Every fresh reader called this out.
4. **Policy promises** in `claims-register.md`: deletion on request (today a manual database operation; test one first), reply time, "your teachers review every mark" (the product does not enforce it), the free professor trial, the lawyer review of the privacy page.

**Decisions**
5. **Founders on the about page:** name current employers (Samsung Research, Blinkit, AWS internship) or not (`showCurrentRoles`). The investor reader assumed part-time founders from the present-tense bios; say what is true.
6. **The investor ask:** the page says "talk to us" with no round size, use of funds or pipeline. Add a line, or leave it to the conversation. The deck outline has the slot.
7. **Results page:** keep it reachable at `/results/` (noindex, not in the nav) or remove the route until a comparison exists.
8. **Pull request:** open it against `eval/cbse-science-first-run` (clean diff, this work only) or `v1-full` (brings the eval commits along). I recommend the eval branch, merged after that one.
9. **The pilot offer's success-criteria blanks** (`materials/pilot-offer.md`): the suggested ranges (75–90% of marks accepted without change; 2–5 minutes per sheet) are proposals. Keep or change.
10. **First ten names** for week 1 of the campaign (still outstanding from checkpoint 1).

## Known limits, stated honestly
- Q35(a) on the home page shows two real errors (a line read as crossed out; a criterion credited without the hormone named). That is the honest section made concrete; the professor reader trusted the authors more and the system less for it.
- Performance score 78–84 on image-heavy pages under simulated slow 4G. Real-world loads on 4G will be fine; the estimate is bound by the framework's CSS and font chain.
- The second examiner sees the grader's marks in the same request. The site says so plainly; a blind second scoring is in the backlog.

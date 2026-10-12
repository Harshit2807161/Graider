# Reference sites for the Gr8r website

Five sites studied on 2026-10-12 in a headless Chromium (Playwright, Chromium 1228) at 1440×900 desktop and 390×844 phone (2× pixel ratio, mobile + touch emulation). The Chrome DevTools MCP could not start because another session held its browser profile, so the same work (first screen, a screenshot per screen while scrolling, full-page capture, `getComputedStyle` reads) was done from a Playwright script. Screenshots live in the session scratchpad under `refsites/<site>/`; contact sheets of every scroll position are in `refsites/_contact-sheets/`.

Numbers below are computed values read from the live pages, not estimates, unless marked "approx." from a screenshot.

---

## 1. Edexia — edexia.com

Australian, four people, same category as Gr8r (AI grading of English essays for VCE / HSC / QCE / WACE / IB). Also read: `/accuracy`, `/research`, `/privacy`.

**Headline.** "AI grading and feedback, built for IB teachers." The curriculum word is a switch: under the headline, "Calibrated to IB English · switch to VCE · HSC · QCE · WACE" swaps the headline and calibration (it showed IB for an `en-IN` visitor). There is no conventional subheadline. The hero *is* the product: a large text box ("Paste your T…", typed in by an animated cursor), an exam-paper picker ("Paper 1: Guided Analysis"), "Use a sample essay", and a "Get expert feedback" button.

**Clear in seconds?** Yes for what and who: AI grading, English teachers in named Australian/IB curricula. Less clear that it is a classroom platform rather than a one-off feedback toy, because the first screen is a paste box.

**Primary CTA.** Two competing ones. The nav button "Join the waitlist" (navy pill, top right) and the in-hero "Get expert feedback" (try it now, no sign-up). Both above the fold on desktop. On phone the hero changes: headline, a product screenshot (the writing-replay view), then "Try Edexia with a sample essay" (filled navy) and "Scan an essay" (outline), CTA top at y≈514 of an 844 screen, so above the fold. The closing section: "Bring Edexia to your classroom. Join the waitlist. Teachers and students get free access, school leaders get a private walkthrough."

**Product shown as.** A live demo in the hero (the paste box really grades). Below: a tella.tv screen-recording embed beside "Teachers stay in control", a tabbed feature list ("And so much more") whose right side swaps product screenshots/looping MP4s at 804×452–543, and a "Full demo 6:26" video. Product imagery is real UI, about 56% of content width.

**Navigation.** Research, About, Privacy + "Join the waitlist" + "Log in" + language globe (3 links, 2 buttons). Footer adds a page per curriculum, How It Works, Demo, Accuracy, AI Detection, Security.

**Typography.** Headline Playfair Display 80px / 500, line-height 84px, tracking −3.2px, navy `rgb(1,0,66)`; one phrase ("for IB") in accent violet. Section heads Playfair 56/500 with italic accent words ("Accuracy you *can trust.*"). Body Inter 16px; most running text is Inter 14px/400, line-height 22.75, grey-blue `lab(47.8…)` ≈ `#64708a`. Small amount of `ui-monospace`.

**Colour.** Background near-white `#FCFCFC` with lavender washes `#F5F4F9`; text navy `#010042`; accent violet `rgb(81,57,250)` `#5139FA`; a gradient `linear-gradient(325deg, #010042 → #6554ED → #5139FA)` and a conic violet→pink "aurora" border spinning (8s, infinite) around the hero input.

**Width / spacing.** Max content 1152px (11 containers), FAQ 896, text 672. Generous vertical gaps; whole page 8.6k px desktop.

**Mobile.** Proper re-composition rather than a squeeze: hero swaps the paste box for a screenshot + two big buttons; H1 drops to 38.4px; feature tabs become a stacked list; no horizontal overflow at 390px.

**Animation.** Fade-in-up on hero (0.6s), the spinning conic border, a blinking caret, an 80s logo marquee, an abstract swirling lavender background (an iframe, `hero-radiant.html`). Only the typed caret has a job (it says "paste here"); the rest is mood.

**Ownable device.** Two: the curriculum switch in the headline, and a shelf of rendered book spines ("All Texts. All Frameworks." — *Beloved*, *Macbeth*, *A Doll's House*…), which says "we know your syllabus" without a sentence. The book shelf is the most memorable thing on the page.

**Machine-made tells.** Violet two-colour gradients and the spinning aurora border; abstract swirl hero art; italic accent-colour words in every section head; quote box with oversized quotation marks; active feature tab shown with a coloured left border; logo marquee; giant wordmark ("EDEXIA") bleeding off the footer.

**Accuracy claims.** Home: "81.2% exact. 98.3% within one. Across 579 essays at St Bernard's College, Edexia matched teacher judgment at upper-range consistency. When it's not exact, it's one grade band away." `/accuracy` gives two big stat cards, "What That Means" (human graders agree exactly 60–80% of the time), "How the Study Worked" in three lines, "How Edexia Is Trained", and a bar comparison (Edexia 81.2%, Human graders typical 60–80%, ChatGPT generic ~60% "ETS study"). `/research` explains QWK in plain words ("being off by one point is much better than being off by three… if 70% of essays are 4/6, QWK would be near zero for a model predicting 4/6 every time") and compares 0.81 QWK from 20 examples with the Kaggle AES 2.0 winner's 0.84 from 1,700+.

Judgement: the best-presented accuracy story of the five, and still weak where it matters. (a) The method line "Teachers accepted or changed Edexia's grade for each essay" means teachers saw the AI grade first; that is an anchored review, not blind agreement, and inflates the figure. (b) The study is VCE English at one school, but the home page headline at the moment says IB. (c) "Within one" is described as both "±1 mark" and "one grade band". (d) The 60–80% human range and the ETS figure have no link. (e) The research chart's y-axis starts at 0.60. Gr8r should copy the shape (number, sample, school, year, method, what it means, plain-language metric) and fix every one of these.

**Trust / security.** Section on the home page ("Privacy you can trust": data stays yours, not used for training; de-identified, Australian servers; SOC 2 Type II, ISO 27001, ST4S). `/privacy` is a hub of real documents: Privacy Policy, Security Measures, *Certifications and Data Transfers* (a plain-language walkthrough that mentions handwritten scans going overseas), Subprocessor List, Data Retention, AI Transparency, AI Framework and Ethics, SLA, Acceptable Use. Strong for a four-person company.

**Pilot / trial ask.** Waitlist for everyone; teachers and students free; "school leaders get a private walkthrough"; the FAQ "What does onboarding look like?" spells out a department meeting, 5–10 minute individual check-ins and fortnightly touch-points through the term. Concrete and low-effort; no success criteria or end date.

**Gr8r should borrow:** the try-it-now hero (Gr8r equivalent: "grade a sample answer sheet" with a real scan, no sign-up); the board switch (CBSE / ICSE / state board / university) if the product really changes with it; the plain-language metric explanation; a privacy hub that names where handwritten scans go; the onboarding description in the FAQ; the book-spine idea of showing domain knowledge as an object rather than a claim.
**Avoid:** violet gradients, aurora borders, swirl backgrounds, italic accent words; an anchored "teachers accepted or changed" method; unsourced comparison bars; truncated axes.

---

## 2. Frizzle — frizzle.com

US, K-12, reads handwritten classwork in every subject. Also read: `/privacy`, `/legal/subprocessors`, `/pricing`.

**Headline.** "The operating system for every classroom" ("operating system" in italic orange gradient; "classroom" underlined with a yellow highlighter band).
**Subheadline.** "Students keep working on paper. Frizzle reads every page in real time - math, ELA, science, social studies, and essays - turning handwritten work into the granular data classrooms have never had: who's stuck, which misconceptions are spreading, what each student needs next."

**Is the headline vague?** Yes. "Operating system for every classroom" is a category metaphor that would fit an LMS, a timetable app or a chat tutor; it never says paper, handwriting or marking. The page works anyway because the subheadline and the hero card do the explaining, and the first five words of the subheadline ("Students keep working on paper") are a better headline than the headline. A stranger gets it in about five seconds from the picture, not the words.

**Primary CTA.** "Start free" with an email field ("your@school.edu"), above the fold on desktop (y≈675) and on phone (y≈719), with "Free for individual teachers · No credit card · FERPA & COPPA compliant" under it. Secondary: "Talk to a teacher on our team →" under the FAQ. A sticky black pill ("+50 teachers signed up today · Start free") follows the reader down every screen.

**Product shown as.** A coded (HTML, not image) mock of a marked quiz in the hero, about 530px wide (≈45% of the 1200 container): ruled paper, a student's working in a handwriting font, green circle around a correct step with a margin note "nice distribution!", red circle around "x = 4" with a tag "sign error: should be −4", a score card "5/10 C" and "What Maya needs" (strengths and gaps). Marks and annotations draw in with short animations. Further down: a stack of paper with "21/28 papers read · 3 flagged", a "three valid paths" card (Dust Bowl / Gatsby answers all marked VALID), and a class mastery table.

**Navigation.** How it works, Features, For teachers, For schools, Pricing + Sign in + Start free (5 links, 2 actions). On the privacy page the header changes to a different template (Features, Pricing, Articles, About, Contact, "Start Free Trial").

**Typography.** H1 Fraunces 84px / 400, line-height 0.96, tracking −2.94px, ink `#1A1410`. H2 Fraunces 56/400, H3 Fraunces 24–44. Body Inter 17–19px, `#3A2F26`. Labels JetBrains Mono 11px / 600 uppercase, tracking 1.76px. Fake handwriting in Caveat. Four families.

**Colour.** Paper cream `#FBF4E4` (header, sections) and `#FFFCF5` (surfaces), ink `#1A1410`, brown greys `#3A2F26` / `#6B5D4F`; accent orange `#E0531A` used as a gradient to `#FAB417`; marking colours green `#2F8F4E` (correct) and red `#E63946` (error); a dark brown-black closing CTA panel with an orange glow.

**Width / spacing.** Max 1200px (inner 1136); text blocks 720–760. Comfortable, a little busy: each section has an eyebrow label, an italic word, a body paragraph, three ticks and a mock.

**Mobile.** Stacks cleanly, no horizontal overflow, H1 48px. Two flaws: the logo and "Sign in" collide in the header ("FrizzleSign in"), and the sticky "+50 teachers" pill covers content on every screen.

**Animation.** Circles and annotations draw onto the student's work (0.5–0.6s), pulsing dots on "Live" and the sign-up pill, a progress bar under the paper stack. The marking animation explains the product; the pulsing dots only signal "live".

**Ownable device.** The marked student page: examiner-style circles, ticks and margin notes on handwriting. That is the right device for this category and the reason the page works. It is undercut by using a handwriting *font* rather than real scans.

**Machine-made tells.** Two-colour orange gradient text in the H1 and buttons; monospace uppercase eyebrow labels on every section; three icon-topped step cards ("01 Snap a stack / 02 Frizzle reads everything / 03 See the whole class"); three privacy cards; a pill badge with a pulsing dot; a dark CTA panel with a glow; fake live counters.

**Numbers.** None has a source. "100,000+ QUESTIONS GRADED" (badge) sits next to "TODAY ON FRIZZLE 142,318 responses read · 2,419 teachers · ~8 min avg. per class": the "today" number is larger than the all-time one, and both are static text in the server-rendered HTML, not a live feed. The "+50 teachers signed up today" pill is filled by a server action named `getTodaySignupBoost`; the name suggests a padded figure (not verifiable from outside). The FAQ's "97% on K–12 student handwriting in our last benchmark" has no dataset, metric or link, and the pricing table repeats "Handwriting accuracy 97%" as a plan feature. "Ms. Chen flagged 3 misconceptions before lunch" is a made-up vignette shown as if it were real.

**FAQ from teacher objections.** Good model. "The questions teachers ask first": Do my students need an iPad or login? Which subjects? How accurate is the handwriting recognition? Will it work with our curriculum? Is student data used to train your AI? How long does setup take? What does it cost? Can it tell me WHY a student got something wrong? Each answer is two or three plain sentences; the accuracy answer includes the right behaviour ("When confidence is low, Frizzle surfaces the page for a one-tap human check instead of guessing").

**Trust / security.** Home: "Privacy isn't a checkbox. It's the foundation." with three cards (FERPA & COPPA, SOC 2 Type II; AES-256 / TLS 1.3, "Student PII never leaves your district"; export, deletion, no training). The footer "Security" link goes to the privacy policy; there is no security page. The privacy policy is genuinely good: plain, specific (school is the owner, students never get accounts, zero-retention required of AI providers, "Output can be wrong. Teachers must review it", 60-day deletion, 7-day breach notice where NY law applies). The sub-processor list is a two-column table (Sub-processor | Description) of 14 vendors including OpenAI, Anthropic, Google Gemini, AWS, Vercel, Supabase, LangChain, MathPix, PostHog; no location, no data categories, no indication which ones see student work. It also contradicts the home page: "Student PII never leaves your district" cannot be true with US-hosted model providers reading the scans.

**Pilot / trial ask.** Self-serve: free forever for individual teachers (50 worksheets a month), Pro $200/yr with a 14-day trial, Institution "Contact sales", "Typical setup: under 48 hours". Pricing FAQ includes "Do you offer school-wide pilots?" No pilot terms on the page.

**Gr8r should borrow:** examiner marks on a student's page as the hero; the honest escalation sentence in the accuracy FAQ; the FAQ framed as "questions teachers ask first"; a public sub-processor page (but with location, purpose, data seen, retention); a privacy policy in plain words; the cream-paper palette idea only if Gr8r's own marks need it.
**Avoid:** a metaphor headline; handwriting fonts standing in for real handwriting; unsourced accuracy numbers; counters that look live and aren't; any security sentence that the sub-processor list contradicts; sticky promo pills; orange gradient text; mono eyebrow labels on every section.

---

## 3. Flint — flintk12.com/security

US K-12 AI tutor platform. Studied the security page only, for how it explains student-data handling to schools.

**Headline.** "The trusted AI for schools". **Subheadline.** "Flint meets the strictest privacy and safety requirements schools have, in the US and abroad. Every standard we are held to is one we earned, and each is reviewed and renewed as the rules change." Clear that this is a trust page; the headline itself is a claim, not information.

**CTA.** Only the nav's "Start for free →" (orange pill) and an orange announcement bar for an unrelated course. No CTA aimed at a school's security reviewer (no "request our DPA", no security contact).

**Product shown as.** Small coded UI cards in a purple frame, ~512px, one per section (data table, permissions table, waiver form, chat transcripts, source citations). Hero is a stock photo of students with hand-drawn scribbles, plus four self-made round badges (FERPA, COPPA, GDPR "compliant", ESSA Tier 4), each stamped with Flint's own logo.

**Navigation.** Solutions ▾, Outcomes ▾, Resources ▾, Pricing + Login + Start for free (4 items, 3 dropdowns). The footer is huge (≈80 links, including ten "Compare" pages).

**Typography.** Headings GT Super Text (serif) 64/700 hero, 40/700 H2, 32/700 H3, tracking −0.02em. Body Inter 16px / 28px line-height at 80% opacity of `#19140F`; eyebrows Inter 14/700 uppercase grey.

**Colour.** White page, aubergine hero `#3D0E3A` and panels `#551451`, accent orange `#FD5512`, cream alternate sections `#FEFCF5`, green status pills `#2A7F3C` on `#E7F7EB`.

**Width.** 1152 max (1088 content), two columns of ~512.

**Structure of the security "tables".** Each section is a two-column block: left, an H3 claim + one paragraph + three ticked bullets; right, a small UI-styled card that restates the claim as data.
- **Student data** card (header "Student data · OAK HILL ACADEMY"): four rows, label → value pill — Shared with third parties: **Never**; Used to train AI models: **Never**; Visible to other schools: **Never**; Kept separate for your school: **Always**; footer "REGION: GDPR compliant. FERPA aligned."
- **Who can see Maya's work** (columns PERSON | CAN SEE): Maya P., Student → Her own work; Mr. & Mrs. Patel, Parent → Through Maya's login; Ms. Rivera, Teacher → Biology 101 submissions; Dr. Okafor, Administrator → School-wide.
- **Audit scope** (dark panel): list of what the EU AI Act audits cover.
- **Signed DPAs**: state chips (Illinois, Maine, Massachusetts, New Hampshire, New York, Rhode Island, Vermont) + "Your state next."
- **COPPA**: a three-step numbered flow (your waiver → we review the language → younger students get access).
- Then AI behaviour (won't give answers, stays on topic), accuracy (answers cite the teacher's slides), educator oversight (every transcript visible), augmentation not replacement.

The idea is excellent: the "who can see what" table with named example people is the clearest way to explain access control to a principal. The execution has faults: a large orange circular icon overlaps each card and hides the data ("Biology 101 submissions" and "School-wide" are covered on desktop; values are cropped to "Neve" on phone); the content is example data, not the actual policy matrix; the badges are self-issued; the "Shared with third parties: Never" row sits awkwardly with an AI product that sends prompts to model providers (the bullet "Not accessible to the AI providers Flint runs on" is asserted, not explained).

**Mobile.** Stacks to one column; the cards keep desktop proportions and get cropped at the right edge; the decorative orange discs remain. Long (15.8k px).

**Animation.** None.

**Ownable device.** The small "who can see Maya's work" permission table.

**Machine-made tells.** Big floating icon discs; stock photo with doodles; self-made compliance badges; every section in the same claim + three ticks + card pattern; tick-icon bullet lists everywhere.

**Gr8r should borrow:** explain data handling as a table with rows a principal can check: "Who can see a student's answer sheet" (student, parent, class teacher, exam head, Gr8r staff, model provider → what and when); "Where the scan goes" (component → provider → region → retained for); the "Never / Always" row format for the hard promises, each one true and checkable. Name real people roles from an Indian school (class teacher, HOD, principal, exam cell).
**Avoid:** decoration overlapping data; example tables posing as policy; self-made badges; claims the sub-processor list would contradict.

---

## 4. Greptile — greptile.com/benchmarks

How a vendor publishes its own evaluation.

**Headline.** "AI Code Review Benchmarks". **Subheadline.** "An evaluation of 5 AI code review tools across 50 real-world bugs from production codebases (2025). See which tools actually catch the issues that matter." Above it, four tags: "5 tools · 50 bugs · 5 repos · 2025". Instantly clear.

**CTA.** Only the nav's "Contact sales" and "Sign up" (green). No pitch in the body and no closing CTA: the page reads as a report, not an ad, which is why it is credible.

**Structure.**
1. **Hero**: title, one-sentence scope, the four count tags.
2. **Overview** (left text, right an interactive chart "Greptile vs [tool ▾]", bug detection by severity): what was compared; default settings, no custom rules or fine-tuning; "All PRs come from public, verifiable repositories, so you can inspect the sources and reproduce the runs on your own."
3. **Methodology** (left text, right "Test dataset" list: Python/Sentry, TypeScript/Cal.com, Go/Grafana, Java/Keycloak, Ruby/Discourse, each linking to GitHub): how cases were built (10 real bug-fix PRs per repo, traced to the introducing commit, very large and single-file changes excluded); the protocol (before/after branches, a fresh PR replicated across 5 clean forks, full repo access, hosted plans, default settings); the definition of success ("caught" only when the tool explicitly identified the faulty code in a line-level comment and explained the impact; verified against the known bug); the caveats in plain sentences ("conducted in July 2025, and these tools evolve quickly, so performance may change over time. Scoring considered only detection of the original bug; false positives, style suggestions, and unrelated comments did not affect the catch rate.").
4. **Bug Catch Performance**: one sentence with every number ("Greptile led with an 82% catch rate, 41% higher than Bugbot (58%). The rest stack clearly: Bugbot and Copilot in the mid-50s, CodeRabbit at 44%, and Graphite at 6%."), an overall bar chart, then three small charts by severity (Critical, High, Medium + Low). Critical is a tie (58% / 58%) and is shown as one.
5. **Case Library**: the definition of "caught" repeated in italics; tabs per repository; a table with columns PR / bug description (PR title + one-line bug) | Severity (coloured tag) | one ✓/✗ column per tool; a "Total catches" row (8/10, 4/10, 3/10, 4/10, 0/10). Every ✓/✗ links to the actual PR so the reader can read the tool's comment.

On phone the case table becomes one card per PR with the five tool marks in a row; charts keep their bars; no horizontal scroll.

**Typography.** H1 Anybody 72/600, tracking −2.88, in blue `#5882FF`; H2 Anybody 48/600 `#2A2A2A`; body DM Sans 16/24 `#3D3B4F`; Space Mono for labels, nav, table headers (the most-used face on the page). **Colour.** Grey paper `#E9E9E9`, panels `#EEEEEE`, accent green `#28E99F` (sign-up, announcement bar), tool colours in pale tints. **Width.** Frame to 1600px with 96px gutters; text columns 544–672px. **Spacing.** Sections separated by 122px hatched bands; blueprint-style dashed grid lines and corner ticks.

**Animation.** Bars grow up once (0.8s) when charts render. Purposeful.

**Ownable device.** The case library: every row a real case, every mark a link to the evidence.

**Weaknesses to avoid.** Vendor-run with no outside reviewer; n = 50 with no confidence intervals; "41% higher" is a relative figure next to absolute percentages; false positives (noise, the thing reviewers complain about) are excluded from scoring, disclosed but not measured; the hero art (blue crocodile-skin texture) and blueprint decoration are brand noise.

**Gr8r should borrow (most of it):** the four count tags ("1 paper · 31 pages · <n> answers · <month year>"); Overview → Method → Results → Case library order; a written definition of what counts as "correct" (e.g. "within the marking scheme's tolerance of the teacher's mark", and separately "escalated"); the date-and-decay caveat; the case library as a table of every answer with teacher mark, Gr8r mark, escalated?, and a link to the page image and the grade record (the review screen already has this data); ties and losses shown, not hidden; no sales pitch inside the report.
**Avoid:** relative-percentage headlines; excluding the failure mode that matters (for Gr8r, unflagged wrong marks must be counted and shown, not excluded); decorative textures.

---

## 5. Solve Intelligence — solveintelligence.com

YC company, AI for patent attorneys. The restraint reference.

**Headline.** "AI for patents." **Subheadline.** "Join thousands of legal professionals around the world using Solve Intelligence for patent application drafting, prosecution, claim charting, patent litigation, portfolio management & analysis, and more." Clear in under two seconds; the subheadline is a plain list of jobs the product does.

**CTA.** "Book a demo ↗" (black rectangle, centred, y≈311) plus "Request demo" in the nav. After the hero, a "Book a demo" pill stays fixed at the bottom centre of the viewport the whole way down.

**Product shown as.** A large coded product panel straight under the CTA, full container width (1248px): tabs Assistant / Drafting / Prosecution / Charts; the Assistant tab plays a scripted session ("Please review the matter folder and draft one or more provisional applications…" → task list with durations "Review disclosure documents… 2 mins", "Drafting applications… 12 mins" → result). Further down, real UI crops per practice area (claim charts with highlighted passages, sequence data) and clean line-drawn patent figures for Mechanical / Design.

**Navigation.** Product ▾, Solutions ▾, Customers, Resources, Security, Enterprise + Sign in + Request demo (6 items) and a black announcement bar.

**Typography.** One family does nearly everything: FK Grotesk Neue, H1 72px / 400 (fluid, min 48), line-height 1.2, tracking −1.44px, `#111`; H2 40/400; H3 18/500; subheadline light (300) grey `#636363` (14px on phone). FK Roman Standard (serif) only for customer quotes; FK Grotesk Semi Mono for tiny labels ("01/ CONFIDENTIALITY").

**Colour.** White `#FFFFFF`, bone `#FAFAF8`, space grey `#EFEFF0`, text `#111`, secondary greys `#636363` / `#9F9E9E`; one dark section (`#111`) for impact numbers and testimonials. No accent colour at all: buttons are black.

**Width / spacing.** Site max 1248px, 24px container padding. Big quiet gaps; nothing competes with the product panel.

**Mobile.** H1 48px, product panel scales down and keeps its tabs, logos scroll, the sticky "Book a demo" stays, no horizontal overflow.

**Animation.** The scripted product session in the hero (explains the product), a scrolling list of practice areas that brightens the current one, counting-up impact numbers (they start at 49%+ / 686+ and land on 50%+ / 700+), testimonial carousel. Mostly purposeful; the count-up is decoration.

**Trust / security.** A home-page section, "Ensure complete confidentiality.", as a numbered spec list: 01 Confidentiality (no model training, no third-party monitoring, zero data retention settings per LLM provider), 02 Data protection (choose the region; data never leaves it), 03 Encryption (AES-256, TLS 1.3), 04 Certifications (SOC 2 Type II, ISO 27001, ISO 42001, GDPR, CCPA, AWS); each with a link to a deeper page. Plain and checkable.

**Numbers.** "Trusted by 700+ in-house IP teams and law firms", "50%+ average workload saved", "433K+ patent applications created", 21 named testimonials with photos and firms (Intel, DLA Piper, Siemens, Quinn Emanuel…). The named people make it credible; the "50%+" has no method behind it.

**Ownable device.** Restraint itself: monochrome, one typeface, a three-word headline, and the product as the only picture. Also the tabbed, auto-playing product panel.

**Machine-made tells.** Very few: a logo carousel, count-up stats, a dark testimonial carousel. No gradients, no glows, no icon grids.

**Gr8r should borrow:** a plain headline that names the job ("Marks handwritten answer sheets." class of sentence); the subheadline as a list of the real jobs (unit tests, pre-boards, mock tests, internal college exams); the product panel straight under one CTA at full width, scripted from a real run; one family, black-and-white, colour reserved for marks; the numbered security spec with a link per item.
**Avoid:** the persistent sticky CTA (it covers content on phone); count-up numbers; an unsupported "50%+ saved".

---

## Patterns across the five

1. **Explicit beats clever.** The pages that are understood instantly say the job in the headline or a tag line (Solve "AI for patents", Greptile's "5 tools · 50 bugs · 5 repos · 2025", Edexia "AI grading and feedback, built for IB teachers"). Frizzle's metaphor headline is rescued only by its subheadline and picture.
2. **The product is the picture.** Every strong page shows working UI, coded rather than screenshotted where it needs to animate (Frizzle's marked quiz, Solve's agent session, Edexia's live paste box). No site uses an abstract hero illustration as the main image except Edexia's background swirl, which adds nothing.
3. **Education sites converge on a serif display face** (Edexia Playfair, Frizzle Fraunces, Flint GT Super). A serif headline will make Gr8r look like the category, not stand out in it; Solve's single-grotesk restraint is the less common choice.
4. **Content widths cluster at 1150–1250px** (Edexia 1152, Flint 1152, Frizzle 1200, Solve 1248), with text measures 544–760px. Greptile goes to 1600 for tables.
5. **One CTA, repeated.** Each site has one action (waitlist / start free / book a demo) in the nav, hero and closing section. Two of five add sticky floating CTAs; both get in the way on phone.
6. **Accuracy claims are the weakest content everywhere.** Edexia has a method but an anchored one; Frizzle's 97% has nothing behind it; Solve's 50%+ has nothing; only Greptile publishes cases. Nobody in the grading category publishes a case library or counts unflagged errors. That gap is Gr8r's opening.
7. **Trust is a home-page section plus a document hub.** Edexia (hub of real policies, including where handwritten scans go), Solve (numbered spec list with links), Frizzle (good privacy policy, weak home claims and a contradiction), Flint (who-can-see tables). The useful parts are specific and checkable; the badge walls are not.
8. **FAQs framed as the buyer's objections** (Frizzle "The questions teachers ask first", Edexia onboarding / AI detection / privacy) are the most readable part of both education sites.
9. **Pilot asks are soft.** Waitlist + "private walkthrough" (Edexia), free tier + "Contact sales" (Frizzle). None states pilot terms (length, success criteria, what the school provides, what it costs, when it ends). A concrete pilot offer would be distinctive.
10. **Mobile is handled competently by all five** (no horizontal overflow at 390px, H1 38–48px, all honour `prefers-reduced-motion` in CSS). Failures come from decoration: overlapping icon discs (Flint), sticky pills (Frizzle, Solve), header collisions (Frizzle).

---

## Candidate devices for Gr8r

Each one comes from the product's real output; none is decoration.

1. **The examined page.** The hero is a real handwritten answer page (a public CBSE model answer book or a consented sample) carrying Gr8r's own marks: ticks against the steps that earned credit, criterion marks in the margin ("1 / 2"), the question total circled, all drawn in examiner's red from an actual grade record. Rendered from the review screen's data, not hand-made, so it can be swapped when the pipeline improves. Frizzle shows the idea works; doing it on a real scan instead of a handwriting font is the difference.
2. **The evidence highlight.** Each criterion links to the words in the student's writing that earned it, shown as a pale highlighter band on the scan with a thin leader to the criterion line ("Mentions chlorophyll absorbing light: 'the green pigment takes in sunlight'"). Use this one visual only for quoted evidence anywhere on the site (product panel, method page, case library), so readers learn that highlight = proof.
3. **"Sent to you" margin slip.** What the system won't decide shown as a note clipped to the page: "Can't read line 4: sent to the teacher", "Second examiner disagreed by 1 mark: sent to the teacher". This turns escalation (the key honest feature) into an object, and it is the natural header for a "What it does well today / what it sends to you" section.
4. **The examiner's box.** Indian answer books have a "For examiner's use only" grid (Q. No. | Marks Awarded) on the cover. Use that grid, drawn plainly, as the site's table form: for the per-sheet result, the pilot terms, and the case library. Instantly familiar to Indian teachers; nobody else in the category can use it.
5. **Case library, Greptile-style.** An evaluation page with count tags ("1 answer book · 31 pages · <n> answers · <month year>"), Overview → Method → Results → every answer in a table: question, teacher's mark, Gr8r's mark, escalated?, and a link to the page image and the grade record with evaluator rounds. Count unflagged wrong marks as their own column, because that is the failure schools fear. Publish it when the numbers are real; until then, the empty table with its columns and the date of the next run is itself a statement.
6. **The second-examiner strip.** Two marks side by side for one answer, grader and evaluator, with the agreed or escalated outcome, the way a moderator signs below an examiner. Explains the evaluator loop in one glance; good for the "how it works" section instead of a three-step icon row.
7. **The run receipt.** A single typeset line under the hero page, in the style of an exam-cell stamp: "31 pages · read and graded in about a minute · about 22 US cents in model costs · <n> answers sent to the teacher" (the first three are from the CBSE run per the brief; the last is a slot). Every figure from a real run, kept in the content module, updated as runs improve.
8. **Who-sees-the-sheet table.** Flint's idea with Indian school roles and the real data path: student, parent, class teacher, HOD, exam cell, principal, Gr8r staff, model provider (named, with region and retention). Rows of "Never / Only after the teacher publishes / Only to read the page, not kept" that are true today.
9. **Board switch (only if real).** Edexia's curriculum switch adapted to CBSE / ICSE / state board / university, changing the sample page and marking scheme shown, not just a word in the headline.

Use red ink and highlighter as the only colours on a black-and-white page, and real handwriting as the only illustration.

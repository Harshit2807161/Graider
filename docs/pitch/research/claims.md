# Fact-check of claims for Gr8r's website and deck

Checked 2026-10-12. Rules used: a primary source is the gazette, the regulator or company page, or the news report closest to the event. Secondary blogs are listed only as leads and are marked as such.

How the evidence was gathered:
- Quotes marked **[file]** were read from a document I downloaded and read in full (the DPDP gazette PDF, the CBSE FAQ PDF, the PIB PDF, the npm registry).
- All other quotes came through a page-summarising fetch tool, and a few are short fragments. Recheck the live page before anything goes public.
- Pages that loaded content with JavaScript, or returned 403 (The Hindu, Moneycontrol, BBC, Business Standard, Crunchbase), could not be read. Those items are marked.

## Summary of verdicts

| # | Claim | Verdict |
|---|-------|---------|
| 1 | CBSE OSM 2026 problems, vendor security row, parliamentary panel, "no AI" | CONFIRMED (blur is contested by CBSE; the "no AI" text is only in press reports) |
| 2 | DPDP phase-in and the educational-institution exemption | PARTLY (dates right; the exemption is narrower than the claim says) |
| 3 | Inc42: $249M, 31 deals, 2025 | CONFIRMED |
| 4 | Two YC W25 AI-grading companies raised "on pilots alone" | CONTRADICTED on the batch (Frizzle is S25), COULD NOT VERIFY "pilots alone" |
| 5 | School sales pattern (decision-maker, 4-9 months, Oct-Feb budgets, pilot criteria) | PARTLY (cycle and roles found; Oct-Feb contradicted by the likely source) |
| 6 | Competitor transparency | See table (facts, no single verdict) |
| 7 | Technical | CONFIRMED, except Email Sending is public beta, not GA |

---

## 1. CBSE on-screen marking (OSM), Class 12, 2026

**Verdict: CONFIRMED**, with three qualifications:
- CBSE's own FAQ disputes the "blurred images" allegation, while the Education Secretary conceded some scripts stayed illegible.
- The "parliamentary summons" is a committee *invitation* to the CBSE chairman and the Education Secretary. A teenager also testified before it.
- The "AI was not used" statement is documented only in press reports of CBSE or official statements. CBSE's own FAQ never uses the word AI.

**Timeline**
- 2026-02-09: CBSE circular introduces OSM for Class 12 only. Class 10 stays on paper. (Secondary: Wikipedia and Careers360. Not read on cbse.gov.in.)
- 2026-02-13: CBSE says no AI is used. Tribune: "The board has clarified that AI is not being used to check Class 10 or Class 12 answer sheets." The same report says OSM "does not involve automated or AI-based marking."
  - https://www.tribuneindia.com/news/trending/cbse-osm-students-need-not-panic-class-12-board-exams-not-checked-by-ai/
- 2026-05-13: Class 12 results. Students report blurred scans, missing pages and mismatched sheets.
- 2026-05-17 (press report dated 17 May; briefing "on Saturday", so probably 16 May): Business Today reports officials saying "AI was not used." Its own wording: "CBSE clarified that artificial intelligence was not used in evaluating Class 12 answer sheets."
  - https://www.businesstoday.in/india/story/ai-was-not-used-cbse-defends-digital-marking-amid-class-12-result-row-531878-2026-05-17
  - The same report gives about 98,66,222 answer sheets evaluated and nearly 13,000 considered for re-evaluation.
- 2026-05-17 (Sunday press conference, reported 18 May): Education Secretary Sanjay Kumar on scan quality. Quotes from the Daily Pioneer report:
  - "there were still some legibility issues because the ink used in some answer sheets was of a very light colour."
  - "More than 13,000 such answer sheets were separately identified and manually checked."
  - https://www.dailypioneer.com/news/after-neet-shock-cbse-faces-heat-over-on-screen-marking
  - A search summary (unfetched, so unverified) gave about 68,018 rescanned and 13,583 evaluated manually. Treat "more than 13,000" as the confirmed figure.
- 2026-05-18, CBSE FAQ (official PDF) **[file]**. Q27: "Is the allegation by the students about blurred images in the OSM is correct?" Answer: "No, the fact is that during scanning, first level quality check was done and if required answer book was rescanned."
  - Q11 also says: "if answer books were blurred and could not be read ... teachers could reject those answer books."
  - https://www.cbse.gov.in/cbsenew/documents/FAQ-OSM_18052026.pdf
- 2026-05-28: Education Minister Dharmendra Pradhan admits "certain discrepancies." IIT Kanpur and IIT Madras experts are brought in to review.
  - https://www.dailypioneer.com/news/dharmendra-pradhan-admits-discrepancies-in-cbse-osm-evaluation-process-iits-to-review-system (via search summary only)
- 2026-05-31: CBSE statement on X about the vendor portal. Business Today quotes: "closely monitoring the vulnerabilities in the OnMark portal of our service provider" and "The identified vulnerabilities have been contained, and other exploitable weaknesses are being ruled out." All India Radio quotes a variant: "...contained, and a thorough review is being carried out."
  - https://www.businesstoday.in/amp/education/story/student-flagged-flaws-now-cbse-says-experts-from-govt-and-iits-are-securing-its-systems-534152-2026-05-31
  - https://newsonair.gov.in/cbse-deploys-cybersecurity-experts-and-iit-teams-to-secure-onmark-portal/
  - The vendor is Coempt Eduteck (formerly Globarena), per Wikipedia and Tribune. The Tribune piece is dated 2026-06-18, and Coempt denies tender conditions were altered. Coempt says the Vedant Srivastava wrong-sheet case came from the physical scanning, not software.
  - https://www.tribuneindia.com/news/india/cbse-on-screen-marking-row-standard-scanners-used-tender-norms-not-altered-coempt-clarifies
- 2026-06-02: Parliamentary Standing Committee on Education (chair Digvijaya Singh). News Arena, updated 2 June 2026, says it "invited the Secretary of the Department of School Education and Literacy, Sanjay Kumar", and called in CBSE chairman Rahul Singh. It also directed the CERT-In Director General to attend.
  - https://newsarenaindia.com/nation/osm-row-parliament-panel-summons-cbse-chief-education-secretary/78859
  - Same day: CBSE chairman and secretary were moved out. A one-member committee (S. Radha Chauhan) was set up to probe OSM procurement, with a one-month deadline. That comes from search summaries of Business Standard and The Hindu, which I could not open, plus Wikipedia.
  - I found no public report of the probe's findings as of 2026-10-12.

**Conflicting detail**
- The Wire headline says CBSE dropped Coempt's platform for re-evaluation. A Republic headline says CBSE retained Coempt. I saw only the headlines.
- Wikipedia (secondary) lists the full timeline and links to BBC, The Hindu, Indian Express and Moneycontrol. Several of these I could not open.

**Safe to say publicly:** "In 2026 CBSE moved Class 12 marking on-screen, the rollout drew public complaints about scan quality and portal security, and CBSE said AI was not used to mark papers; teachers marked them."

---

## 2. DPDP Rules 2025: phase-in and the educational-institution exemption

**Verdict: PARTLY.** The phase-in dates are right. The exemption is narrower than the claim describes.

**Source:** The gazette itself, G.S.R. 846(E), MeitY, New Delhi, "the 13th November, 2025" **[file]**. https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
(The PIB explainer, dated 17 Nov 2025, says the Rules were notified "on 14 November 2025". The gazette says 13 November. Use 13 November; 18 months from it is 13 May 2027. https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)

**Phase-in, Rule 1 [file]:**
- "(2) Rules 1, 2 and 17 to 21 shall come into force on the date of their publication in the Official Gazette."
- "(3) Rule 4 shall come into force one year after the date of publication of this Gazette."
- "(4) Rules 3, 5 to 16, 22 and 23 shall come into force eighteen months after the date of publication of this Gazette."
- Rule 10 (verifiable parental consent) and Rule 12 (child exemptions) both fall in the 18-month group, so about 13 May 2027.
- Rule 10(1): "A Data Fiduciary shall adopt appropriate technical and organisational measures to ensure that verifiable consent of the parent is obtained before the processing of any personal data of a child". Rule 10(2)(a): "adult" means someone who has completed eighteen years.
- Open item: MeitY floated cutting the timeline from 18 to 12 months in January 2026 (Business Standard, 2026-01-22; reportedly aimed at significant data fiduciaries). Trackers dated September 2026 found no notified amendment. Check the gazette before the deck is final.
  - https://www.business-standard.com/technology/tech-news/meity-may-cut-compliance-timeline-for-key-dpdp-rules-to-12-months-126012201293_1.html

**Exemption: Rule 12(1) and Fourth Schedule, Part A, item 3 [file]:**
- Rule 12(1): "The provisions of sub-sections (1) and (3) of section 9 of the Act shall not be applicable to processing of personal data of a child by such class of Data Fiduciaries as are specified in Part A of Fourth Schedule, subject to such conditions as are specified in the said Part."
- Part A, S. No. 3: Class: "A Data Fiduciary who is an educational institution." Conditions: "Processing is restricted to tracking and behavioural monitoring— (a) for the educational activities of such institution; or (b) in the interests of safety of children enrolled with such institution."
- Definition: "'educational institution' shall mean and include an institution of learning that imparts education, including vocational education".

**What the exemption covers, precisely:**
- It exempts the institution as a Data Fiduciary. It does not name vendors. A software vendor is not an "educational institution" under the Schedule's definition. As a processor acting for a school it works under the school's duties. If it decides purposes itself, it is a fiduciary in its own right and gets no exemption.
- It lifts only section 9(1) and 9(3) of the Act. From my reading of the Act (not re-fetched here), that is the parental-consent duty and the bar on tracking, behavioural monitoring and targeted advertising. Section 9(2), the bar on processing that harms a child's wellbeing, is not lifted.
- The condition is that processing is "restricted to tracking and behavioural monitoring" for the institution's educational activities or child safety. Whether grading exam answers counts as such "monitoring", and whether the carve-out removes the consent duty for all processing, is not settled by the text. Commentators flag the same gap. Take legal advice before claiming exemption.
- Rule 12(2) / Part B lists separate purpose-based exemptions. None names education.

**Safe to say publicly:** "India's DPDP Rules were notified on 13 November 2025 and most duties, including verifiable parental consent for children's data, apply from 13 May 2027; Gr8r is designed so that schools stay in control of student data." (Do not claim that the exemption covers Gr8r.)

---

## 3. Inc42: Indian edtech funding, 2025

**Verdict: CONFIRMED.**

- Inc42, "Can The Indian Edtech Sector Make A Comeback This Year?", dated 15 Jan 2026: "Funding in the edtech sector plummeted by 56% YoY in 2025 to $249 Mn from $572 Mn invested in 2024" and "Deal count in the sector also took a major hit in 2025, down 35% to 31 deals closed in the year under review" (from 48 in 2024). Period: calendar 2025. Also called "an 8-year low."
  - https://inc42.com/features/can-the-indian-edtech-sector-make-a-comeback-this-year/
- Inc42's list pages repeat it: "National edtech funding fell 56% in 2025 to $249 Mn across 31 deals, an eight-year low".
  - https://inc42.com/lists/top-30-funded-edtech-startups-in-bengaluru-2026/
- **Number differences between Inc42's own pieces:** the 2024 base is $572 Mn in the 2026 piece but $568 Mn in Inc42's earlier headline ("At $568 Mn, Edtech Funding Continues To Sulk In 2024"). A search summary says the earlier 2024 report counted 29 deals against 48 in the later piece (not verified by fetch).
  - https://inc42.com/features/at-568-mn-edtech-funding-continues-to-sulk-in-2024-revival-anticipations-timid/
- **2026 year-to-date:** no edtech-specific figure found. Inc42's H1 2026 funding article (all sectors: about $5.2 Bn, down 9% by search summary) does not mention edtech. https://inc42.com/features/indian-startup-funding-slips-9-to-5-2-bn-in-h1-2026/
  - The only 2026 number is a projection, not a result: "National funding is expected to recover only modestly in 2026, with investors projecting a $350 Mn to $450 Mn range" (Bengaluru list page above).

**Safe to say publicly:** "Inc42 reported Indian edtech funding fell to $249M across 31 deals in 2025, an eight-year low."

---

## 4. YC W25 companies in AI grading

**Verdict: CONTRADICTED on batch for Frizzle; "raised on pilots alone" COULD NOT VERIFY for either.**

**Edexia: Winter 2025 (W25), confirmed on its YC page** (https://www.ycombinator.com/companies/edexia)
- One-liner: "AI Teacher Assistant for Grading Essays". Team size 4.
- Traction on the YC page: "Since launching on August 1st, we have already collaborated with 11 of Australia's best schools in Q4 2024." No funding is listed there, and it does not say the schools paid or that these were pilots.
- Edexia's YC job post (https://www.ycombinator.com/companies/edexia/jobs/RHxYDtn-founding-school-partnerships-lead-account-executive): "Approximately US$4.2M raised at a roughly US$35M valuation." It also says "School partnerships have been founder-led to date" and "We now have a strong initial motion and more school opportunities than the founders can personally pursue."
- Conflicting, lower figures come only from secondary profiles (US$500K at YC acceptance per Business News Australia, not openable; a $600K pre-seed per VC Backed; Tracxn $500K). Treat as unreconciled.

**Frizzle: Summer 2025 (S25), not W25** (https://www.ycombinator.com/companies/frizzle)
- "Summer 2025". One-liner "AI Grading for Teachers". Team size 2.
- Traction: "Teachers have already graded thousands of worksheets and saved hundreds of hours using Frizzle!"; "named an official White House AI Education Partner".
- Funding: none on the YC page. Crunchbase lists a $500,000 pre-seed on 2025-09-09 led by YC (search result, page not openable). YC launch post: https://www.ycombinator.com/launches/OFP-frizzle-ai-grading-for-math-teachers

**Other W25 grading or assessment companies:** none besides Edexia found in YC's education list for W25. Closest are Miyagi Labs (exam prep) and Excellence Learning (worksheet feedback). https://www.ycombinator.com/companies/industry/education

**What is actually public:** Edexia's W25 batch and its "11 schools" claim, one unreconciled raise figure, and nothing that says it raised "on pilots alone". Frizzle cites usage only.

**Safe to say publicly:** "AI grading companies have been backed by Y Combinator, including Edexia (W25) and Frizzle (S25)." (Do not say "raised on pilots alone.")

---

## 5. School sales in India

**Verdict: PARTLY.** The likely source, RAYSolute, matches the cycle length and the roles. It contradicts the October-February budget window and has no written-criteria or conversion-date rule.

**Likely origin:** RAYSolute Consultants, "an education-exclusive consulting firm, founded 2023" (author Aurobindo Saxena), pages "Updated Sep 2026". It is a marketing page and the rest is "reserved for RAYSolute clients". Stats are unsourced.
- GTM guide: https://www.raysolute.com/edtech-india-go-to-market-schools.html
- Strategy page: https://www.raysolute.com/edtech-b2b-sales-strategy-schools.html

**Supports:**
- Cycle: "The typical B2B school EdTech sales cycle in India is **4-9 months**." "Premium schools move faster (4-6 months); budget schools move slower (6-9 months)." The strategy page says "3-9 month".
- Decision-maker: "4-layer decision hierarchy: Teacher (user) → Department Head → Principal → Trustee/Director (budget approval). The principal is the gatekeeper for most decisions; the trustee/director approves larger budget commitments (INR 10+ lakh)." "For premium schools, the director/trustee may engage directly. For budget schools, the principal has more autonomy." It says *budget*, not *mid-market*, schools.
- Pilots: it recommends paid pilots (INR 5,000-25,000, "INR 10-15K for mid-market schools"; claimed 60-70% conversion against 40% for free). Failure mode listed: "Pilots running indefinitely, with no defined conversion trigger". No *written* success criteria or conversion date rule appears in the visible text.
- IME (Indian market-entry advisory), 2 Apr 2026: Chairman/Trustee/Owner "Final authority (especially in private schools)"; Principal "Operational decision-maker"; selling only to principals "may stall without management buy-in". No durations.
  - https://indiamarketentry.com/education-buying-decisions-india-global-providers/

**Contradicts:**
- Budgets: the claim says October-February. RAYSolute says "February-March: Schools finalize next year's budgets; start evaluating EdTech vendors. April-May: Budget allocations finalized; major purchase decisions happen." It also says "Don't expect sales in Dec-Jan or Aug-Nov." I found no Oct-Feb text in any RAYSolute page I downloaded. One search summary attributed it to RAYSolute, and I could not reproduce it.

**Not India-specific (loose analogy only):**
- Empire Publishers (US): "12 to 24 months" first user to signed contract; "Schools rarely sign multi-year contracts without a pilot period."
  - https://theempirepublishers.com/blog/selling-edtech-to-schools-complete-guide
- Monaqo (US): "6-18 months".
  - https://monaqo.in/b2b-marketing-for-edtech/

**Gap:** I found no independent India-specific data on cycle length or budget months, and no first-person founder write-up. All figures are consultancy or marketing content.

**Safe to say publicly:** "School decisions in India usually involve the principal and school management, and we start with a short pilot with agreed success criteria." (Avoid quoting months.)

---

## 6. Competitor public sites (internal use only; do not name on site)

Checked on 2026-10-12 via page fetches. JavaScript-loaded content may have been missed.

| | (a) Price | (b) Measured accuracy with method | (c) Real graded sheet to inspect | (d) Limitations page |
|---|---|---|---|---|
| **Gradescope (Turnitin)** | Partial: the Basic plan is free after the trial. Institutional: "Questions about Institutional pricing? Fill out the form below." | None found on the home or pricing pages | Static sample images, plus "Get a Demo"; nothing to open | No |
| **CoGrader** | Yes: Starter "$0", Individual "$15/month, billed annually" or "$19/month"; schools "based on size" | Yes: whitepaper June 2026. "600 essays" with TEA gold scores. Pooled 98.5% within one point and 79.3% exact. Extended responses only (283): 96.8% within one, 72.4% exact. Self-labelled "Technical report, not peer reviewed" | One illustrative graded essay on the home and handwriting pages; no individual graded samples in the study | No dedicated page, but the whitepaper has a limitations section and the handwriting page says "Like any AI, it can misread a word now and then" |
| **Edexia** | No: waitlist only | Yes: "81.2% exact. 98.3% within one", "579 essays at St Bernard's College", VCE English, 2025. Thin method: no definition of "exact", no grader detail. The claim that humans agree "60 to 80%" is unsourced | No: the demo page showed "Loading demo..." | None stated |
| **Eklavvya** | Partial: Free plan, 25 exam credits; Professional and Enterprise by quote | No: only "53% Accuracy Improvement" with no baseline or method | No | No |
| **Smartail DeepGrade** | No: "Book a Demo" | None on its site. A press release dated 2026-02-12 says "approximately 97% accuracy" and "over 3 million marks per month". Vendor claim, no method | No: demo videos only | No |

Sources: https://www.cograder.com/pricing, https://www.cograder.com/research/staar/, https://www.cograder.com/ai-handwritten-grading/, https://turnitin.gradescope.com/pricing, https://www.gradescope.com, https://www.edexia.ai, https://www.edexia.ai/accuracy, https://www.eklavvya.com, https://www.eklavvya.com/pricing, https://smartail.ai, https://smartail.ai/deepgrade-2/, https://www.itvoice.in/smartail-ai-and-bharathcloud-ink-partnership-to-accelerate-ai-adoption-across-3000-schools-in-india

**Positioning note:** Only CoGrader publishes a method *and* limitations. Nobody in this set publishes a graded sheet a visitor can inspect or a stated limitations page.

**Indian AI answer-sheet entrants found** (vendor self-descriptions only; none has a launch date or an independently verified accuracy figure):
- Saraswati AI by Ragxing Tech, https://ragx.tech/saraswati: reads Hindi and English handwriting against a teacher's marking scheme; first paper free, volume pricing on request.
- Chanakya AI, https://aichanakya.in/: question-wise marks and partial credit for coaching institutes, universities and schools; free pilot, no price.
- E-Valuate AI (Pune, E-Valuate AI LLP, "DPIIT-recognised"), https://evaluate-ai.app/: marks scanned handwritten sheets against a rubric. It is the only one with a public price: Plus ₹24,000/year, Pro ₹60,000/year, ₹2/page.
- DASES (Big Chalk Box Pvt. Ltd.), https://www.dasesai.com/: claims "98% accuracy", no method, no price.
- Smartail DeepGrade (Chennai), above.
- Eklavvya (on-screen marking for universities), above.
- Seen in search results but not confirmed: EduSathi (https://edusathi.qzz.io/, page blocked by a bot check), AIvenX (https://aivenx.co.in/), Gradyn (https://www.gradyn.ai/, page content not readable), IntelGrader (https://intelgrader.com/in/boards-answer-sheet-evaluation).
- No dated news report of any of these launching in 2025-26 was found.

---

## 7. Technical

**Verdict: CONFIRMED**, with Email Sending still in beta.

**Next.js**
- Latest stable: **16.4.0**, published 2026-10-06 (npm registry `dist-tags.latest`) **[file]**. Canary is 16.5.0-canary.8. https://registry.npmjs.org/next
- `output: 'export'` is supported with the App Router. The docs page (version 16.4.0, lastUpdated 2026-08-09) says "To enable a static export, change the output mode inside `next.config.js`" with `output: 'export'`. Version history: "`v13.4.0` App Router (Stable) adds enhanced static export support, including using React Server Components and Route Handlers." https://nextjs.org/docs/app/guides/static-exports
- Not supported in an export: cookies, rewrites, redirects, headers, Proxy, ISR, Server Actions, default-loader image optimisation, dynamic routes without `generateStaticParams()`, and Route Handlers that rely on the Request.

**Cloudflare Workers static assets**
- "Requests to static assets are free and unlimited." "There is no additional cost for storing Assets." https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Limits: 20,000 files per Worker version on Free (100,000 on Paid), 25 MiB per file. https://developers.cloudflare.com/workers/platform/limits/
- Workers Free: "a daily request limit of 100,000 requests", which concerns Worker script requests. I did not check how it applies to asset-only requests.
- Cloudflare Pages was not checked.

**Vercel Hobby**
- Prohibits commercial use. "Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan." Commercial includes "Advertising the sale of a product or service" and "Receiving payment to create, update, or host the site". "Asking for Donations does not fall under commercial usage." Page last updated 2026-09-14. A startup marketing site falls under it.
  - https://vercel.com/docs/limits/fair-use-guidelines
  - https://vercel.com/docs/plans/hobby

**Cloudflare Turnstile**
- Free plan: price "Free", up to 20 widgets, 10 hostnames per widget, "Unlimited challenges", 7 days analytics. Enterprise is "Contact Sales". https://developers.cloudflare.com/turnstile/plans/

**Cloudflare Email Service**
- **Email Sending is public beta, not GA.** Changelog, 2026-04-16: "Email Sending is now in public beta." The blog says "Email Sending graduates from private beta to public beta today." No GA entry through the latest changelog item (2026-09-25).
  - https://developers.cloudflare.com/changelog/product/email-service/index.md
  - https://blog.cloudflare.com/email-for-agents
- Sending from a Worker: the `send_email` binding named `EMAIL`, `env.EMAIL.send()`. https://developers.cloudflare.com/email-service/
- Plans and price: "Sending to arbitrary recipients requires the Workers Paid plan." "3,000 included per month, then $0.35 per 1,000 emails." Free plan: outbound "Not available", except sends to verified destination addresses, which are free on all plans. Email Routing (inbound) is free and unlimited. https://developers.cloudflare.com/email-service/platform/pricing/
- Limits: 5 MiB per message (25 MiB for verified destinations only), 50 recipients per email, and "New accounts start with a conservative daily quota" with no fixed number. https://developers.cloudflare.com/email-service/platform/limits/

**Safe to say publicly:** Nothing needed on the site. For internal planning: static export works on Next.js 16.4 but Vercel Hobby is off the table for a company site, and Email Sending needs the Workers Paid plan and is still beta.

# Target lists: method, ranking, starter lists, what to measure

Researched 2026-10-12. Public, institutional information only (names, categories, localities, public websites, general contact channels). No individuals' names, personal phones or personal emails are recorded here; the sheet in section 5 is where Kirtan keeps people, privately and outside the repo.

Legend: **(U)** = could not be verified by me; check before relying on it. "Loaded" = I opened the institution's own page. WebFetch returns a summary, not raw HTML, so quotes are close paraphrases. Anything from background knowledge, not a source, is tagged **(bk)**.

## 0. Findings that change the plan

1. **No Delhi University college is UGC-autonomous.** The UGC list of approved autonomous colleges (1,788 colleges, as on 28 Feb 2026) has Delhi entries under Guru Gobind Singh Indraprastha University only: four management institutes (MERI Janakpuri, JIMS Vasant Kunj, Lingaya's Lalita Devi Institute, MAIMS Rohini). The NCR ones on it are AKTU-affiliated engineering/management colleges in Ghaziabad and Greater Noida (ABES, G.L. Bajaj, Inderprastha, KIET, NIET, Jaipuria Indirapuram, Accurate) and DPG Degree College, Gurugram (MDU Rohtak). "Autonomous" is therefore the wrong filter for colleges; "who controls the internal test" is the right one (section 1.3).
2. **DU colleges do control a slice of marks themselves.** The DU regulation on internal and continuous assessment under the 2022 undergraduate framework, as read from a copy hosted on a college site (DU's own copy returned 403): for a 25-mark internal assessment, class tests 10 marks, assignments/presentations 10, attendance 5; a college-level Internal Assessment Monitoring Committee runs the process; teachers set and mark. So a department or a single teacher can run a pilot without university sign-off. Whether the class tests are handwritten is **(U)**; the regulation says "class tests".
3. **The NEET/JEE Main brands are a weak fit.** Their mass tests are MCQ, OMR or computer-based. Handwritten, subjective marking is in CBSE board prep, CA/CS/CMA, UPSC mains, and (partly) JEE Advanced. Four big NEET/JEE brands were checked; none stated that its tests are handwritten.
4. **School exam dates are not published where I looked.** The school sites gave calendars as images or PDFs I did not open. Only Delhi Police Public School publishes a datesheet with a "Periodic Assessment-1" for 2026-27. Treat unit-test and pre-board timing as **(U)** for every school.

## 1. How to build the lists (repeatable, about one working day per segment)

For every row, record: source, date checked, and one of `verified-on-site / listing-only / unverified`. Re-run monthly; drop anything older than 90 days from outreach without a re-check.

### 1.1 Coaching institutes, Delhi NCR

**Which categories matter, in order for handwritten marking**

| Category | Why it fits | Why it might not |
|---|---|---|
| CBSE Class X/XII board-prep coaching | Subjective, marking-scheme based, in-person tests before boards; Gr8r's strongest ground (the one real run was a CBSE paper) | Many small centres have no website or LMS; tests may be photocopied worksheets |
| CA / CS / CMA coaching | Long subjective papers, mock tests, strict marking schemes | Handwritten format not stated on any site checked (U); subjects heavy on numericals and tables, which are untested |
| UPSC mains / answer-writing programmes | Long handwritten answers, evaluator cost per copy is the whole product; one institute states "scan or photograph the copy and upload it" | Qualitative marking; the "rubric" is looser than a point scheme, so a rubric must be written with the institute; large brands have layered decisions |
| NEET / JEE | Huge volume | Mostly MCQ/OMR/computer-based; only JEE Advanced and foundation-course tests are written. Last priority |

**Where to find them (in order)**
1. **Cluster search on Google Maps** (by hand; I could not verify Maps output). Queries: `UPSC coaching Old Rajinder Nagar`, `UPSC coaching Mukherjee Nagar`, `UPSC coaching Karol Bagh`, `CBSE class 12 coaching <locality>`, `CA coaching <locality>`, `CS coaching Delhi`, repeated per locality: Rajinder Nagar, Karol Bagh, Mukherjee Nagar, Laxmi Nagar, Janakpuri, Pitampura, Rohini, Dwarka, Paschim Vihar, Kalkaji, Preet Vihar, Noida, Gurugram. One secondary source says Rajinder Nagar clusters NEET/JEE institutes and Mukherjee Nagar clusters civil services.
2. **Justdial and Sulekha** category pages for "Coaching Classes" by locality. Justdial returned HTTP 403 to automated fetches (I could not load any listing), so work it in a browser by hand; Sulekha not checked (U). Use them to find small institutes, not to verify claims; ratings and "years in business" are self-reported.
3. **Institute websites**: centre locator, "Contact", "Careers" (a Copy Appraiser or evaluator opening shows handwritten volume), the test-series page (look for "handwritten", "upload your copy", "evaluated within N hours").
4. **UPSC answer-writing platforms**: ForumIAS (Mains Guidance Programme), Drishti IAS (Mains Test Series), Anantam IAS (Answer Writing Evaluation), Rau's IAS, Vision IAS, GS SCORE, Vajiram & Ravi. Each lists Delhi centres and the programmes.
5. **Regulation signal**: the Ministry of Education guidelines for coaching centres (16 Jan 2024) tell states to register centres with more than 50 students and require an up-to-date website. Whether Delhi has adopted them or keeps a public register is **(U)**; check the Delhi Directorate of Education site before assuming a register exists.

### 1.2 Schools, Delhi NCR

1. **CBSE SARAS directory** (saras.cbse.gov.in, "List of Affiliated Schools", about 33,174 schools; loaded). Filters: state, district, region, keyword (name or address), affiliation number, status, school level. Each row: affiliation number, state, district, status, school and head name, address, "Details" link. I saw no export button; copy by district. Use it to build the long list for Delhi, Gurugram, Gautam Buddh Nagar, Ghaziabad, Faridabad and to confirm board and level. Record the head's *title* only.
2. **Delhi Directorate of Education** (edudel.nic.in). Its school information page (`mis/schoolplant/frmDistrictAndSchoolInformation.aspx`) offers district, zone and school dropdowns; I could not see whether results include private schools or contact fields (U). Useful for recognition status; private-school recognition and fee rules sit with the Directorate.
3. **UDISE+ "Know Your School"** (kys.udiseplus.gov.in): search by name, UDISE code or PIN code, per secondary sources; the page text I fetched was empty (U). Good for cross-checking size.
4. **School websites**: Circulars, Calendar/Datesheet, Careers, "Management" or "Leadership" pages (titles). A published datesheet or an ERP login (Edunext, Entab, Skolaro and similar appeared on schools checked) means the school already runs exams and software through a system.
5. **Chain pages**: DPS Society, Amity Group of Schools, Ryan Group, Heritage group, Lotus Valley, Mount Carmel. A chain gives many campuses behind one sign-off; start with one campus, never the group, unless a warm intro goes to the society.

**Mid-market versus premium, and who decides**

| | Mid-market (moderate fee, trust-run or small chain, often 1,000 to 3,000 students) (bk) | Premium (high fee, brand school) |
|---|---|---|
| How to tell | Published fees are the best test: of the 15 schools below only DPS Gurgaon (about Rs 2.0 lakh a year plus Rs 1.1 lakh admission), DPS Indirapuram (about Rs 1.78 to 1.87 lakh tuition) and Heritage Xperiential (Rs 1.15 to 1.33 lakh, banded by class) publish a figure. Everything else in the table is judgement (U) | Same; plus IB/Cambridge alongside CBSE |
| Who decides | Principal is operational gatekeeper; the trustee, chairman or owner has final authority in private schools (IME, 2 Apr 2026) | Principal with a managing committee or society; for DPS-type brands a society-level sign-off is likely (U). RAYSolute: "for premium schools, the director/trustee may engage directly" |
| Cycle (consultancy figure, not independent data) | RAYSolute: 4 to 9 months overall; budget schools slower (6 to 9) | RAYSolute: premium faster (4 to 6 months); one consultancy source (`claims.md` section 5) |
| Note on Delhi fees | The Delhi School Education (Transparency in Fixation and Regulation of Fees) Act, 2025 sets a school-level fee committee (management chair, principal secretary, teachers and parents by lot). I did not verify the final text (secondary sources disagree on dates). Practical reading (inference): a per-student charge to parents would draw parental scrutiny; frame Gr8r as a cost to the school or free in the pilot | |

My list skews upper-mid and premium because those schools have websites that load and publish circulars. True mid-market schools are in SARAS but rarely have a findable site; build that half from SARAS plus Maps, by locality.

### 1.3 Colleges and departments, Delhi NCR

1. **UGC list of autonomous colleges**: PDF at `https://www.ugc.gov.in/pdfnews/8688705_List-of-Autonomous-Colleges.pdf`, linked from `ugc.gov.in/colleges/Autonomous_Colleges`; `aucollege.ugc.ac.in` is the UGC portal. Use `pdftotext` and grep the state. Delhi: 4. NCR UP: 7 (AKTU). Gurugram: DPG Degree College.
2. **Not autonomous but still in control of internal tests**: all DU colleges (91 per one secondary count) set internal assessment (section 0). Pick by department, not by college status. Find tests through a college's "Examination" or "Notices" page and its Internal Assessment Monitoring Committee notice.
3. **Private and deemed universities in NCR** set their own ordinances: Sharda (Greater Noida), Shiv Nadar (Gautam Buddha Nagar), Jamia Hamdard (Delhi, deemed), KIET (describes itself as deemed). Their ordinances and examination bye-laws are public PDFs that spell out the mid-semester structure.
4. **NAAC** (naac.gov.in assessed and accredited institutions list): I did not reach the official download; third-party lists exist but are not authoritative (U). NAAC is an openness signal because IQAC cells run assessment documentation.
5. **Which departments**: management (BBA, BBA-type programmes) and engineering sessional/mid-semester tests, law (BA LLB), journalism, commerce, humanities (long written answers), pharmacy. Science practical files and maths-heavy answers are lower priority until diagrams and numerics are proven.

## 2. Segment ranking

Facts used: school budgets are set February to March; a consultancy source says do not expect school sales from August to January and that cycles take 4 to 9 months (`claims.md` section 5, one consultancy, unsourced stats); pilots start now to be inside the February to March budget decision.

| Rank | Segment | Speed of decision | Pain: handwritten sheets per week | Budget-window fit | Verdict |
|---|---|---|---|---|---|
| 1 | **Owner-led coaching: CBSE board prep, CA/CS/CMA, UPSC answer-writing (smaller and mid-size)** | Fast; founder or director decides (inference from site structure; U) | High. Weekly or fortnightly tests per batch; UPSC copies evaluated by paid evaluators; ForumIAS lists "Copy Appraisers" as an opening | No dependence on the school budget cycle; a pilot can start in 2 to 4 weeks | **Start here.** Shortest path to a running pilot and to sheets |
| 2 | **Mid-market, standalone or small-chain CBSE schools** | Slow (4 to 9 months) but principal-led at small schools | Medium. Unit tests, half-yearly, pre-boards; whole-school volume is large but per-class small | **Pilot Nov to Jan on a unit test or pre-board creates the February to March decision.** Risk (bk): board exams start in mid-February, so staff time is scarce just when budgets are set; pilot early | **Second, in parallel from week 2.** One principal-led pilot per school |
| 3 | **College departments** | Fast at teacher/HoD level, no procurement | Medium. Mid-semester and internal tests; semester count of sheets per course is bounded | Not budget-dependent for a one-course pilot | **Parallel track (the plan's professor track).** Good for method write-ups |
| 4 | **Premium schools and chain/society schools** | Slowest; society or chairman layer | High volume but highest reputational sensitivity after the CBSE 2026 episode | Same Feb to Mar window | **After pilot references exist.** Do not lead with a DPS-type sign-off |
| 5 | **NEET/JEE Main brands** | Corporate, slow | Very high, but MCQ/OMR | n/a | **Skip** except Class 9 to 10 foundation or JEE Advanced written tests |

UPSC timing is **(U)**: the answer-writing programmes appear to run year-round, but their cycles around the prelims and mains dates were not checked.

## 3. Starter lists

### 3.1 Fifteen coaching institutes

Priority: A = strong fit and probably fast; B = good fit, bigger or evidence thinner; C = weak fit, only for foundation/written tests.

| # | Institute | Category | Locality | Website | Why them / evidence | Pri | General public channel |
|---|---|---|---|---|---|---|---|
| 1 | Anantam IAS | UPSC mains | Old Rajinder Nagar | anantamias.com | States students "write by hand", faculty mark, copies scanned or handed in; evaluation feedback "within 24 hours" for its evaluation programme (loaded) | A | Phone and enquiry form on contact page |
| 2 | Adharshila Academy | CBSE X/XII | Mayur Vihar | adharshilaacademy.com | Chapter, unit and term-end tests, in-person and online; mock tests before boards; app and online testing (loaded) | A | admin@ address and enquiry form |
| 3 | AIM Institute of Professional Studies | CA/CS/CMA | Janakpuri | aiminstitute.co.in | Mock test series and regular assessments across CA, CS, CMA; handwritten format (U) (loaded) | A | info@ address, landline, demo form |
| 4 | Edu Junction | CA/CS/CMA | Kalkaji | edu-junction.com | Mock tests and test series; format (U) (loaded) | A | Contact page, WhatsApp link |
| 5 | Turning Point Institute | CBSE IX-XII | Paschim Vihar | turningpointedu.org | Mock tests with feedback sessions, test series page, crash courses for X and XII; app (loaded) | B | info@ address, contact form |
| 6 | ForumIAS Academy | UPSC mains | Karol Bagh, Mukherjee Nagar | academy.forumias.com | Mains Guidance Programme with 8 sectional + 4 + 8 FLTs; answer-copy upload portal (marked "Deprecated" on forumias.com); lists "Copy Appraisers" as an opening (employer U) | B | helpdesk@ address and phone on site |
| 7 | Drishti IAS | UPSC mains | Mukherjee Nagar, Karol Bagh | drishtiias.com | Mains test series, up to 64 tests in a package, "timebound evaluation of answer sheets by a dedicated team", online and offline; handwriting not stated (U) | B | care@ address, phone on site |
| 8 | Rau's IAS Study Circle | UPSC mains | Old Rajinder Nagar (U: address from a search snippet) | rauias.com | 15- and 28-test mains series, "evaluation in 24 to 48 hrs"; pen-and-paper mode named for the Bengaluru campus, Delhi mode (U) | B | info@ address (U: not confirmed by direct load) |
| 9 | Vision IAS | UPSC mains | Karol Bagh | visionias.in | Mains series of 8 to 30 GS tests plus essay tests; current site silent on handwritten copies, an archived page said "scan copy via email" (old) (U) | B | enquiry@ address, phone on Delhi page |
| 10 | GS SCORE (IAS SCORE) | UPSC mains | Karol Bagh | iasscore.in | Sectional and full mains mocks with faculty mentorship; handwritten submission not stated (U); careers page lists no evaluator role | B | info@ address |
| 11 | Vajiram & Ravi IAS Institute | UPSC mains | Old Rajinder Nagar | vajiramandravi.com | Delhi centre on Pusa Road; homepage shows a Mains Test Series card only; evaluation method (U) | B | Not found on the pages loaded (U) |
| 12 | FIITJEE | JEE/NEET | Kalu Sarai (HQ), Janakpuri, Noida Sec 62 (U for the last two) | fiitjee.com | Test series for JEE Main and Advanced; format (U). Site had a TLS error, read with curl -k | C | info@ address and helpline on contact page |
| 13 | Aakash Educational Services | NEET/JEE + foundation | Patel Nagar, Model Town, Jasola Vihar, Punjabi Bagh West, Pitampura | aakash.ac.in/delhi-ncr | All India Aakash Test Series and "regular assessments"; mostly MCQ; foundation and board courses are the written part | C | Toll-free number and corporate@ address on site |
| 14 | Vidyamandir Classes | JEE/NEET | Janakpuri, Pitampura, Vasant Kunj, Preet Vihar | vidyamandir.com | Regular tests with analysis, "VMC AI Studio"; test format (U) | C | Enquiry form (no phone or email on the page I loaded) |
| 15 | Aspirations Institute | CBSE | Dwarka Sec 7 | aspirationsinstitute.com | Regular tests and assignments; highlighted test portal is online MCQ, so only its written tests fit; board test format (U) | C | Site lists a phone, WhatsApp and a personal-style email (not recorded here) |

Checked and dropped: ALLEN (computer-based test series; no Delhi NCR centre found on the page loaded), PW Vidyapeeth (page 404; Noida centre from a search snippet only), Resonance (no Delhi NCR centre listed), Mentors Eduserv (certificate error), A2S (403).

### 3.2 Fifteen CBSE schools

All CBSE per site or SARAS record. Tier: **fee** = published fee figure seen; **(j)** = my judgement, unverified.

| # | School | Board | Type | Chain or standalone | Locality | Website | Public signal |
|---|---|---|---|---|---|---|---|
| 1 | Delhi Police Public School | CBSE | Mid-market (j) | Standalone (managing body U) | Safdarjung Enclave | delhipolicepublicschool.com | **Best signal:** datesheet page lists "Periodic Assessment-1" (Cl. I-XI), Half Yearly, Mid Term for 2026-27; eConnect ERP; contact form |
| 2 | Salwan Public School | CBSE | Mid-market (j) | Salwan group (trust) | Rajendra Nagar | salwanpublicschool.edu.in | Edunext ERP; academic calendar (image, unreadable to me); careers page, no exam post; generic email and office phones listed |
| 3 | DPS Faridabad | CBSE + Cambridge | Mid-market (j) | DPS Society brand | Sector 19, Faridabad | web.dpsfsis.com | Datesheet page (semester 1 only); calendar PDF; own portals and app; info@ address |
| 4 | Amity International School, Saket | CBSE | Mid-market (j); fee figures conflict | Amity Group of Schools | Saket | amityschools.in/saket | Amitranet ERP group-wide; use the group contact page (campus email looks wrong) |
| 5 | Ryan International (Ryan Group CBSE campuses) | CBSE (group also ICSE/IGCSE/IB) | Mid-market (j) | Ryan Group chain | Delhi, Noida, Gurugram | ryangroup.org/ryaninternational | Parent app; group is the entry point, pick one campus |
| 6 | DPS Indirapuram | CBSE | Upper-mid (**fee** about Rs 1.78 to 1.87 lakh tuition) | DPS Society brand (operator Saket Education Society, from a search result, U) | Indirapuram, Ghaziabad | dpsindirapuram.com | SchoolsOS ERP; calendar PDF and vacancy PDF (not opened); info@ address |
| 7 | DPS Noida | CBSE | Upper-mid (j) | DPS Society ("core" school per Wikipedia, U) | Sector 30, Noida | dpsnoida.co.in (found via search; dpsnoida.com is a placeholder; confirm) | Skolaro ERP, app, smart boards; contact@ address and phones |
| 8 | Lotus Valley International School | CBSE (IB link on site, U) | Upper-mid (j) | Lotus Valley group | Sector 126, Noida | lotusvalley.com | Edunext ERP and app; info@ address |
| 9 | Mount Carmel School | CBSE | Upper-mid or premium (j) | Small group (Anand Niketan, Dwarka, Gurugram) | Anand Niketan, Dwarka; Gurugram Sec 115 | mountcarmelschool.com | Parent portal; vacancies page; no general email, contact page only |
| 10 | DPS Gurgaon | CBSE | Premium (**fee** about Rs 2.0 lakh composite + Rs 1.1 lakh admission) | DPS Society brand | Sector 45, Gurugram | dpsgurgaon.org | Entab portal; 185 smart classes (site claim); phones and admissions form |
| 11 | Heritage Xperiential Learning School | CBSE (affiliation number on site) | Premium (**fee** Rs 1.15 to 1.33 lakh by class + Rs 2.3 lakh admission, 2027-28) | Multi-campus group | Gurugram Sec 62 and 64, Noida | heritagexperiential.org | Annual planner page; ERP help desk (product unnamed); contact form |
| 12 | DPS R.K. Puram | CBSE + IB Diploma | Premium (j) | DPS Society brand (own Principal) | R.K. Puram | dpsrkp.net | Calendar page has no exam dates; vacancies page; phone, email unreadable |
| 13 | DPS Vasant Kunj | CBSE + Cambridge IGCSE | Premium (j) | DPS Society brand | Vasant Kunj | dpsvasantkunj.com | Datesheet page lists Pre-Mid Term and Mid Term; parent/employee portals; school email on site |
| 14 | Modern School, Barakhamba Road | CBSE | Premium (j) | Standalone (founded 1920) | Barakhamba Road | modernschool.net | Parent portal; vacancies page; general email and phones on site |
| 15 | Sanskriti School | CBSE (SARAS record; site does not say) | Premium (j) | Standalone | Chanakyapuri | sanskritischool.edu.in | No technology signal found; general email and phones on site |

Checked, not usable: The Shri Ram School (no CBSE), Shiv Nadar School (IB/IGCSE), Pathways and Scottish High (IB/ICSE). Sites that failed to load (certificate or domain errors, so unchecked): Mother's International, Bal Bharati, Bharti Public School, St Mark's, Sardar Patel Vidyalaya, Suncity; Step by Step's site was a placeholder; no official site found for Maharaja Agrasen Model School. Springdales is a reserve. No school named an Examination Incharge or Controller of Examinations; no school posted an exam-coordinator job. Only five of the 15 are plausibly mid-market, so build ten more mid-market schools from SARAS by locality (section 1.2).

### 3.3 Ten Delhi/NCR colleges and departments

"Handwritten" is inferred from "written test" in each source; none shows an answer book. Dates of sources are in the notes column.

| # | Institution | Status | Website | Department / test whose internal tests are written | Notes |
|---|---|---|---|---|---|
| 1 | Maharaja Agrasen Institute of Management Studies (MAIMS), Rohini Sec 22 | UGC-list autonomous (Delhi); GGSIPU | maims.ac.in | BBA, B.Com (H), BA (JMC), BA LLB: internal exams, 1.5 hours, at least 50% of syllabus (notice, Oct 2023) | Controller of Examinations signs notices; ERP (edumarshal); strongest Delhi autonomous case |
| 2 | Management Education & Research Institute (MERI), Janakpuri | UGC-list autonomous (Delhi); GGSIPU | meri.edu.in/meri | All programmes: mid-term exams run by the Examination Department; 4 unit tests per semester, but the CCIE page describes unit tests as quizzes and puzzles, so the written part is the mid-term | Examination Ordinance PDF (Dec 2025 upload); Controller of Examination page; ERP app |
| 3 | Jagannath International Management School (JIMS), Vasant Kunj | UGC-list autonomous (Delhi); GGSIPU | jimsd.org | BBA, BCA, BJMC; internal-test format **(U)**, no public document found | Contact-only until a test document is found |
| 4 | DPG Degree College, Sector 34, Gurugram | UGC-list autonomous (MDU Rohtak) | dpgdegreecollege.com | Internal assessment page links an MDU rule: 20% internal (5% attendance, 10% "unannounced test", 5% assignments), a 2011-12 resolution (old); site also lists a "Sessional Exam Notice 2026" (not opened) | Weak evidence of current scheme |
| 5 | ABES Engineering College, Ghaziabad | Site: "autonomous since 2025"; UGC list agrees (AKTU) | abes.ac.in | Sessional tests per a sister site's datesheets, 2019 to 2021 only; current scheme **(U)** | Examination Cell; no tech signal found |
| 6 | KIET Group of Institutions, Ghaziabad | On UGC list as autonomous; own site now says deemed university | kiet.edu | MCA teaching scheme: mid-semester exam (40 marks) plus continuous assessment (10) for a 2-credit paper (search snippet, PDF not opened) | Check status before outreach; ERP in use |
| 7 | Jamia Hamdard, Hamdard Nagar | Deemed university (bk; site pages did not say) | jamiahamdard.ac.in | All schools: "current examination system is based on written assessment"; two sessional exams make up the 40-mark internal assessment (bye-laws 2025-26) | Controller of Examinations; e-Campus portal; generic admin emails listed |
| 8 | Sharda University, Greater Noida | Private university | sharda.ac.in | All programmes: continuous assessment 25, mid-semester 25, end-semester 50; Controller of Examination runs mid-semester; students may view MSE answer books (ordinances, to July 2024) | LMS login on homepage |
| 9 | Shiv Nadar Institution of Eminence, Dadri | Deemed, Institution of Eminence | snu.edu.in | Midterm examination week; instructors set the scheme; format **(U)** (handbook 2023-24) | Exams Committee with Controller and Deputy Controller roles; no tech signal found |
| 10 | Shaheed Sukhdev College of Business Studies (SSCBS), Rohini | DU college, affiliated | sscbs.du.ac.in | Internal assessment under the DU framework: class tests plus assignments; teachers share marks (notice dated 7 Nov 2025) | Internal Assessment Monitoring Committee; the one DU entry because it publishes a notice |

Reserve: Lingaya's Lalita Devi Institute of Management and Sciences (Delhi, UGC-list autonomous; lldims.edu.in); no test document found.

## 4. Finding the decision-maker, and signals of openness

Record titles and the public channel only. Names go in Kirtan's private sheet, from the institution's own site or a warm intro.

| Type | Titles that matter | Where they are usually listed publicly | How to approach |
|---|---|---|---|
| Coaching, owner-led | Founder or Director; Centre Head; Academic Head; Head of Tests / Test Series; evaluator coordinator | "About", "Contact", centre-locator pages, Careers page (an evaluator opening names the team), Google Business listing | Enquiry form or generic email first; a demo on their own paper |
| Coaching, large brand | Academic/Test & Evaluation head; corporate | Same, but decisions are layered (U) | Only after a pilot reference |
| School, mid-market | Principal (operational gatekeeper); Manager, Chairman or Trustee (final authority in private schools); Vice Principal or Examination Incharge (title inferred; none appeared on any site checked) | Management/Leadership page; the CBSE SARAS record lists the head; school circulars are signed by title | Principal's office via generic school email or main phone; ask who in management sees technology pilots |
| School, premium or chain | Principal plus managing committee or Society Chairman; group head office | Society or group page; school's "Leadership" | Warm introduction; pilot at one campus first |
| College | Head of Department; Principal or Director; Controller of Examinations or Examination Cell; Internal Assessment Monitoring Committee (DU); IQAC coordinator (inference) | Department pages, notices, ordinance PDFs | A single teacher who owns a paper is enough for a one-test pilot; do not go to the exam cell first |

**Public signals of openness (rank by count)**
- An ERP, LMS or app already in daily use (found on most schools above: Edunext, Entab, Skolaro, SchoolsOS, jupsoft; Moodle-like LMS at Sharda; edumarshal at MAIMS and JIMS).
- Answer-copy upload or "scan and upload" already offered (Anantam IAS; ForumIAS portal; Rau's student portal).
- A published datesheet or assessment calendar with a periodic or unit test (only Delhi Police Public School here).
- A hiring page with an evaluator, copy appraiser or exam coordinator opening (ForumIAS "Copy Appraisers"; Drishti evaluator roles appear only on third-party job boards, employer U).
- Smart classes, a parent app, a mock-test series page, "online and offline assessments".
- NAAC, IQAC activity or a recent move to autonomy (ABES, DPG, MAIMS) as a sign the institution is rewriting its assessment process.
Absence signals: no website, a placeholder site, or a TLS error (several schools above) usually means you reach them by a warm introduction, not email.

## 5. What to measure in the first eight weeks, and the sheet

**Per segment, weekly (extends the funnel in `campaign-plan.md`)**

| Segment | Funnel | Segment-specific measure |
|---|---|---|
| Coaching | Listed, contacted, replied, demo held, pilot agreed, sheets graded | Sheets per week they currently hand-mark; evaluators and cost per copy (if they share it); days from test to marks returned today versus in the pilot; how many answers were escalated; share of marks accepted unchanged by their evaluators |
| Schools | Same | Which exam (unit, half-yearly, pre-board) and class; number of approval layers touched (principal only, or management too); days from first contact to a yes; teachers' hours spent in review; whether board-exam talk drifted into the conversation |
| Colleges | Same | Courses and sheets per test; teacher's own marks beside Gr8r's on the same sheets (agreement per criterion); whether a department head had to approve; permission to write it up |

Targets for the eight weeks come from the campaign plan: first ten messages in week 2, three coaching and two school pilots by week 4. Track against those.

**Sheet template (keep it private; it holds people; do not commit it)**

| Column | Content |
|---|---|
| id | Running number |
| segment | coaching / school / college |
| sub_category | CBSE board prep, UPSC, CA/CS, mid-market school, DU department... |
| institution | Public name |
| locality | Area, city |
| website | Public URL |
| source | SARAS, Maps, site, intro; date found |
| verified_status | verified-on-site / listing-only / unverified |
| public_channel | Generic email, form or main phone used |
| contact_title | Principal, Director, HoD... (title) |
| contact_name | Private: the person, once they have given it to you or their own page lists it |
| warm_or_cold | warm (who introduced) / cold |
| openness_signals | ERP, upload portal, datesheet, hiring page |
| exam_type_and_volume | e.g. weekly mock, about 120 sheets (their words) |
| first_message_date | |
| replies | Date and gist |
| demo_date | |
| pilot_status | none / agreed / running / done / converted / stopped |
| success_criteria_agreed | Y/N and the sentence |
| conversion_date | Written date |
| sheets_graded | |
| teacher_agreement | Per pilot, with method |
| escalation_rate | |
| time_per_sheet | |
| objection | In their words |
| next_step_and_date | |
| consent_for_reference | none / name only / quote / logo |

Keep personal names and numbers in a private sheet only. The India DPDP Rules (gazette of 13 Nov 2025) phase in over time; I did not verify how they treat a small outreach list. Ask a lawyer before storing more than titles and business channels.

## Sources and references

Standards and method
1. UGC list of approved autonomous colleges as on 28 Feb 2026: https://www.ugc.gov.in/pdfnews/8688705_List-of-Autonomous-Colleges.pdf (downloaded and parsed; Delhi lines 335 to 338); page: https://www.ugc.gov.in/colleges/Autonomous_Colleges
2. CBSE SARAS affiliated schools directory: https://saras.cbse.gov.in/SARAS/AffiliatedList/ListOfSchdirReport ; category/contact page: https://saras.cbse.gov.in/SARAS/Home/Category_Wise
3. Delhi Directorate of Education: https://www.edudel.nic.in ; school information page: https://www.edudel.nic.in/mis/schoolplant/frmDistrictAndSchoolInformation.aspx
4. UDISE+ Know Your School: https://kys.udiseplus.gov.in (page text empty when fetched; features from secondary sources)
5. Ministry of Education, Guidelines for Registration and Regulation of Coaching Centres, 16 Jan 2024: https://education.gov.in/sites/upload_files/mhrd/files/document-reports/Guideliens_Coaching_Centres_en.pdf
6. Delhi School Fees Act 2025, secondary summary: https://www.scconline.com/blog/post/2025/08/18/delhis-new-school-fees-law-school-education-transparency-in-fixation-and-regulation-of-fees-act/
7. DU regulation on internal and continuous assessment (10 Feb 2023), copy hosted by a DU college: https://sgtbkhalsadu.ac.in/uploads/studentscorner/internal-and-continuous-assessment/University%20Regulations%20regarding%20IA%20and%20CA.pdf
8. Sales cycle, budgets, decision roles: `docs/pitch/research/claims.md` section 5 (RAYSolute https://www.raysolute.com/edtech-india-go-to-market-schools.html ; IME https://indiamarketentry.com/education-buying-decisions-india-global-providers/)
9. Locality clusters (secondary): https://dev.to/monu_nishad_db8662eae975f/best-neet-coaching-in-delhi-a-complete-guide-for-2026-aspirants-3efc

Institution pages loaded (WebFetch, 2026-10-12): anantamias.com (courses/mains-test-series, mains-answer-writing-evaluation, contact), academy.forumias.com/mains-guidance-program, forumias.com/blog/workwithus, drishtiias.com/upsc-mains-test-series, rauias.com/upsc-test-series, visionias.in/delhi, iasscore.in, vajiramandravi.com, fiitjee.com (curl -k), aakash.ac.in/delhi-ncr, vidyamandir.com, adharshilaacademy.com, turningpointedu.org, aspirationsinstitute.com, aiminstitute.co.in, edu-junction.com; the 15 school sites in 3.2; meri.edu.in, maims.ac.in, jimsd.org, dpgdegreecollege.com, abes.ac.in, kiet.edu, jamiahamdard.ac.in (Examination Bye-Laws 2025-26 PDF), sharda.ac.in (Ordinances to July 2024 PDF), snu.edu.in (UG handbook 2023-24 PDF), sscbs.du.ac.in (IA notice, Nov 2025).

## Not verified, in one place
- Justdial and Sulekha listings (Justdial 403, Sulekha not tried); Google Maps results (not runnable here).
- Whether the SARAS directory exports; whether the DoE Delhi page lists private schools.
- Delhi's adoption of the 2024 coaching guidelines; the final text of the 2025 fee Act.
- Every school's unit-test and pre-board dates; any school's examination in-charge; whether any class test is handwritten (written, per sources).
- Handwritten format at CA/CS institutes and NEET/JEE brands; Rau's and Vision's current Delhi hand-copy processes.
- Tier (mid-market vs premium) for 12 of 15 schools; autonomy status of KIET (own site says deemed).
- Decision speed of owner-led coaching centres (inferred from structure, not measured).
- The February to March board-exam crunch, UPSC cycle timing and mid-market school size (background knowledge).

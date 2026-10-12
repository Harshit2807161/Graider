# Pilot (`/pilot`)

Audience: a principal, director, coaching-centre head or professor who has decided to ask for a pilot, or is close to it. The page states the offer plainly and collects the request.
Primary CTA: Send request (the form's button).

## H1

A free pilot on one exam

## Lede

Gr8r marks one exam for one class on your own marking scheme. Your teachers review every mark. Before we start, we write down together what success means, and at the end of four weeks you decide whether to continue or stop.

---

## Section 1. What the pilot includes

Heading: What the pilot includes

| | |
|---|---|
| Cost | Free |
| Scope | One exam, one class, up to about 200 answer sheets |
| Length | Four weeks |
| Setup | We set up the exam and its marking scheme in Gr8r with one of your teachers, who checks every marking point before marking starts |
| Marking | Every sheet marked with its evidence and a second examiner; answers Gr8r can't settle go to your teachers with the reason |
| Reviews | Two sessions with your teachers to go through Gr8r's marks and where they disagree with them |
| Success criteria | Agreed in writing before we start, and yours to set |
| At the end | You decide: continue on per-sheet pricing, which we agree with you before the pilot ends, or stop |

---

## Section 2. What we ask of you

Heading: What we ask of you

- The question paper and your marking scheme.
- The answer sheets, as scanned PDFs or clear phone photos.
- A teacher's time to check the marking points at the start and to review Gr8r's marks.
- Your honest view in the two review sessions.

---

## Section 3. Success criteria

Heading: How we'll judge it

Body:
Before any sheet is marked, we write down what the pilot has to show, and the targets are yours. For example:
- the share of Gr8r's marks your teachers accept without change;
- how much teacher time each sheet takes, with Gr8r and without it;
- how many answers Gr8r sends to your teachers, and whether the reasons were sound.

At the end we go through the results against those targets with you. You keep the comparison.

---

## Section 4. Good to know before you ask

Heading: Good to know before you ask

- **Internal exams only.** Unit tests, half-yearlies, pre-boards, mock tests and college internal assessments. Not board exams.
- **Drawings aren't marked yet.** If your exam has questions answered with a diagram, your teachers mark those.
- **Your data.** Sheets and marks are stored by Gr8r for the pilot, and page images are read by a model provider. When the pilot ends, tell us if you want your data deleted, and we delete it.
  Link: Privacy and data

---

## Section 5. The form

Heading: Request a pilot

Intro line: Tell us a little about your institution and the exam you have in mind. We'll reply by email.

Fields, in order:

| Field label | Type | Required | Help text / options |
|---|---|---|---|
| Your name | Text | Yes | |
| Your role | Select | Yes | Principal; Director or trustee; Coaching-centre head; Head of department; Teacher; Professor or lecturer; Other |
| Institution | Text | Yes | Name of your school, coaching institute or college |
| City | Text | Yes | |
| Type of institution | Select | Yes | School; Coaching institute; College or university |
| Email | Email | Yes | We'll reply here |
| Phone | Tel | No | Only if you'd like a call |
| The exam you'd like to try | Textarea | Yes | Subject, class or year, and roughly how many sheets. For example: "Class IX science unit test, about 120 sheets" |
| When would you like to start? | Select | No | This month; Next month; In two to three months; Not sure yet |
| Do you scan or photograph answer sheets today? | Select | No | No, paper only; We scan them; We photograph them; Not sure |
| Anything else we should know | Textarea | No | |

[Turnstile check]

Button: **Send request**

Validation messages:
- Empty required field: "Please fill this in."
- Bad email: "Please check the email address."
- Turnstile failed: "We couldn't confirm you're not a bot. Please try again."
- Send failed: "Your request didn't go through. Please try again, or email us at [contact email]."

Privacy line under the form:
We use what you send only to reply about a pilot. The form is sent to us by email through Resend, which processes it on our behalf, and Cloudflare Turnstile checks that a person sent it. Nothing from this form goes into Gr8r. See Privacy and data.

---

## Success message

Heading: Thank you. We've got your request.

Body: We'll reply by email within [n] working days, from [contact email]. If you have a question paper and marking scheme to hand, have them ready: we'll ask for them first.

---

## Claims used

- Pilot terms (free, one exam, one class, up to about 200 sheets, four weeks, two teacher reviews, written success criteria agreed up front, paid-or-stop at the end): `docs/pitch/checkpoint-1.md` item 5 and answer 5
- What we ask of the school (teacher's time to review, scanned sheets, marking scheme, feedback): `docs/pitch/checkpoint-1.md` item 5
- Pricing per sheet, no number: `docs/pitch/checkpoint-1.md` item 6 and answer 6
- Internal exams only, not board exams: `docs/pitch/positioning.md` ("What we do not say")
- PDFs and phone photos accepted: `.claude/CLAUDE.md` (document intake)
- Teacher checks marking points; escalations with reasons; second examiner: `.claude/CLAUDE.md` (pipeline); CHANGELOG M5, M7
- Drawings not marked: `docs/v2-backlog.md` (CBSE run); `docs/pitch/positioning.md`
- Data stored, page images to a model provider, deletion on request: `docs/pitch/research/sample-sheet-facts.md`
- Form sent through a Worker with Resend and Turnstile: `docs/pitch/checkpoint-1.md` item 12 and answer 12; `docs/pitch/site-map.md` (`/pilot`)

import type { PilotContent } from "./types-pilot";

/** The pilot page (`/pilot`). Copy from docs/pitch/copy/pilot.md; the terms summarise
 *  docs/pitch/materials/pilot-offer.md (the three outcomes at the end, the written report, logins,
 *  the contact person). No price: per-sheet pricing is agreed with each school. The form's fields
 *  and limits are the Worker's (site/worker/src/validate.ts). */
const pilot: PilotContent = {
    meta: {
        title: "A free pilot on one exam",
        description: "Gr8r marks one exam for one class on your own marking scheme, free, over four weeks. Your teachers review every mark, and the success criteria are agreed in writing before we start.",
    },
    title: "A free pilot on one exam",
    lede: "Gr8r marks one exam for one class on your own marking scheme. Your teachers review every mark. Before we start, we write down together what success means, and at the end of four weeks you decide whether to continue or stop.",
    jump: { label: "Request a pilot", href: "#request" },

    terms: {
        id: "includes",
        heading: "What the pilot includes",
        terms: [
            { term: "Cost", detail: "Free." },
            { term: "Scope", detail: "One internal exam, one class, up to about 200 answer sheets." },
            { term: "Length", detail: "Four weeks." },
            { term: "Setup", detail: "We set up the exam and its marking scheme in Gr8r with one of your teachers, who checks every marking point before marking starts. We create logins for your staff." },
            { term: "Marking", detail: "Every sheet marked with its evidence and a second examiner; answers Gr8r can’t settle go to your teachers with the reason. No result reaches a student until your teacher has approved it." },
            { term: "Reviews", detail: "Two sessions with your teachers to go through Gr8r’s marks and where they disagree with them." },
            { term: "Report", detail: "A written report at the end: how many marks your teachers accepted without change, what was changed and why, what was sent for review and why, the time per sheet, and what went wrong." },
            { term: "Success criteria", detail: "Agreed in writing before we start, and yours to set." },
            {
                term: "At the end",
                detail: "You decide, in writing, one of three things:",
                list: [
                    "continue, paid per answer sheet at a rate we agree with you;",
                    "put Gr8r into your next budget discussion, with the month and the approver named;",
                    "or stop. Nothing is owed, and nothing is charged automatically.",
                ],
            },
        ],
    },

    ask: {
        id: "ask",
        heading: "What we ask of you",
        items: [
            "The question paper and your marking scheme.",
            "The answer sheets, as scanned PDFs or clear phone photos.",
            "A teacher’s time to check the marking points at the start and to review Gr8r’s marks.",
            "One contact person at your school.",
            "Your honest view in the two review sessions.",
        ],
    },

    judge: {
        id: "judge",
        heading: "How we’ll judge it",
        intro: "Before any sheet is marked, we write down what the pilot has to show, and the targets are yours. For example:",
        items: [
            "the share of Gr8r’s marks your teachers accept without change;",
            "how much teacher time each sheet takes, with Gr8r and without it;",
            "how many answers Gr8r sends to your teachers, and whether the reasons were sound.",
        ],
        after: "At the end we go through the results against those targets with you. You keep the comparison.",
    },

    notes: {
        id: "good-to-know",
        heading: "Good to know before you ask",
        items: [
            { lead: "Internal exams only.", body: "Unit tests, half-yearlies, pre-boards, mock tests and college internal assessments. Not board exams." },
            { lead: "Drawings aren’t marked yet.", body: "If your exam has questions answered with a diagram, your teachers mark those." },
            { lead: "Your data.", body: "Sheets and marks are stored by Gr8r for the pilot, and page images are read by a model provider. When the pilot ends, tell us if you want your data deleted, and we delete it." },
        ],
        link: { label: "Privacy and data", href: "/privacy/" },
    },

    form: {
        id: "request",
        heading: "Request a pilot",
        intro: "Tell us a little about your institution and the exam you have in mind. We’ll reply by email.",
        optional: "(optional)",
        choose: "Choose one",
        trap: "Website",
        fields: [
            { name: "name", label: "Your name", kind: "text", required: true, autoComplete: "name" },
            {
                name: "role",
                label: "Your role",
                kind: "select",
                required: true,
                options: [
                    { value: "Principal", label: "Principal" },
                    { value: "Director or trustee", label: "Director or trustee" },
                    { value: "Coaching-centre head", label: "Coaching-centre head" },
                    { value: "Head of department", label: "Head of department" },
                    { value: "Teacher", label: "Teacher" },
                    { value: "Professor or lecturer", label: "Professor or lecturer" },
                    { value: "Other", label: "Other" },
                ],
            },
            { name: "institution", label: "Institution", kind: "text", required: true, autoComplete: "organization", help: "Name of your school, coaching institute or college" },
            {
                name: "institutionType",
                label: "Type of institution",
                kind: "select",
                required: true,
                options: [
                    { value: "school", label: "School" },
                    { value: "coaching", label: "Coaching institute" },
                    { value: "college", label: "College or university" },
                    { value: "other", label: "Other" },
                ],
            },
            { name: "city", label: "City", kind: "text", required: true, autoComplete: "address-level2" },
            { name: "email", label: "Email", kind: "email", required: true, autoComplete: "email", inputMode: "email", help: "We’ll reply here" },
            { name: "phone", label: "Phone", kind: "tel", required: false, autoComplete: "tel", inputMode: "tel", help: "Only if you’d like a call" },
            { name: "exam", label: "The exam you’d like to try", kind: "text", required: true, autoComplete: "off", help: "Subject, and class or year. For example: “Class IX science unit test”" },
            { name: "sheets", label: "Roughly how many answer sheets", kind: "text", required: true, autoComplete: "off", inputMode: "numeric", help: "The pilot covers up to about 200" },
            { name: "message", label: "Anything else we should know", kind: "textarea", required: false, autoComplete: "off" },
        ],
        submit: "Send request",
        sending: "Sending your request…",
        errors: {
            required: "Please fill this in.",
            email: "Please check the email address.",
            phone: "Enter a valid phone number or leave it empty.",
            check: "Please check the highlighted fields.",
            turnstile: "We couldn’t confirm you’re not a bot. Please try again.",
            sendFailed: "Your request didn’t go through. Please try again.",
            sendFailedEmail: "Your request didn’t go through. Please try again, or email us at {email}.",
        },
        unavailable: {
            withEmail: "This form isn’t switched on yet. Requests can be sent by email instead, to {email}.",
            withoutEmail: "This form isn’t switched on yet. Requests can be sent by email instead. Contact details are on their way.",
        },
        success: {
            heading: "Thank you. We’ve got your request.",
            body: "We’ll reply by email. If you have a question paper and marking scheme to hand, have them ready: we’ll ask for them first.",
            bodyWithEmail: "We’ll reply by email, from {email}. If you have a question paper and marking scheme to hand, have them ready: we’ll ask for them first.",
        },
        privacy: {
            text: "We use what you send only to reply about a pilot. The form is sent to us by email through Resend, which processes it on our behalf, and Cloudflare Turnstile checks that a person sent it. Nothing from this form goes into Gr8r.",
            see: "See",
            link: { label: "Privacy and data", href: "/privacy/" },
        },
    },
};

export default pilot;

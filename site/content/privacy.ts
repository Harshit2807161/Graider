import type { PrivacyContent } from "./types-info";

/** Privacy and data (`/privacy`). Copy from docs/pitch/copy/privacy.md, trimmed; the sources of every
 *  row are listed at the end of that draft. This page states what the product does as built. It makes
 *  no compliance, certification or encryption-at-rest claim, and must not until a lawyer has read it
 *  and the feature exists. Slots still to be filled are `TODO` values (hidden until filled). */
const privacy: PrivacyContent = {
    meta: {
        title: "Privacy and data",
        description: "What Gr8r stores, where, who can see it, which model providers process what, and how long it is kept, as the product is built today.",
    },

    head: {
        title: "What happens to your answer sheets",
        lede: "This page says what Gr8r stores, where, who can see it, which outside companies process it, and how long it is kept. It describes the product as it is built today, including what it doesn’t do yet.",
    },

    notice: "This page describes Gr8r as built in {date}. A lawyer will review it before we make any statement about compliance with any law. We make no compliance or certification claim here.",
    asOf: "October 2026",
    contentsLabel: "On this page",

    stores: {
        id: "stores",
        heading: "What Gr8r stores, and where",
        table: {
            caption: "What Gr8r stores, with examples, and where each is kept.",
            columns: ["What", "Examples", "Where it is kept"],
            widths: ["18%", "52%", "30%"],
            rows: [
                ["Accounts", "Name, email address, role in your organisation; passwords are stored only as a one-way hash", "Gr8r’s database"],
                ["Student details", "Name, email address, and any extra details your organisation adds, such as a roll number; the classes each student is in", "Gr8r’s database"],
                ["Exams", "Questions, marking schemes, the criteria Gr8r made from them, and every earlier version of those criteria", "Gr8r’s database"],
                ["Exam documents", "Question papers, marking schemes and blank copies you upload", "Files on Gr8r’s server disk"],
                ["Answer sheets", "The files you upload, as uploaded", "Files on Gr8r’s server disk"],
                ["Page images", "Each page of an answer sheet as an image, made from the upload", "Files on Gr8r’s server disk; any text found in a digital file is kept in the database"],
                ["Transcripts and marks", "The text Gr8r read from each answer, the marks, quoted evidence, reasons, feedback, both examiners’ rounds, and every earlier version", "Gr8r’s database"],
                ["Teacher actions", "Changes to marks, corrected transcripts, approvals and publishing, each with who did it, when, the reason, and the before and after", "Gr8r’s database"],
                ["Model call records", "For each call to a model: what was sent, what came back, the model, tokens, cost and time. Page images are recorded as a reference and a fingerprint, not stored a second time", "Gr8r’s database"],
            ],
        },
        servers: {
            value: "TODO: hosting provider and region",
            template: "Where the servers are: {value}.",
            fallback: "Where the servers are: to be named here before the first pilot.",
        },
        notDone: { lead: "What Gr8r doesn’t do today:", body: "it doesn’t encrypt the files or the database itself. Whether the disks are encrypted depends on the server they run on, and we’ll state that here once the hosting is fixed." },
    },

    access: {
        id: "access",
        heading: "Who can see a student’s answer sheet",
        table: {
            caption: "Who can see a student’s answer sheet, what they can see, and when.",
            columns: ["Who", "What they can see", "When"],
            widths: ["30%", "45%", "25%"],
            rows: [
                ["Teachers, administrators and owners in your organisation on Gr8r (for example class teachers, heads of department, the exam cell, the principal)", "Every exam, answer sheet, page image, transcript, mark and history in your organisation. Access is by organisation, not by class: a teacher can open any class’s sheets in your organisation", "Always"],
                ["Owners and administrators of your organisation", "In addition, the full inputs and outputs of each model call, from a sheet’s timeline", "Always"],
                ["The student, if your organisation gives them an account", "Their own results only: marks, feedback and the images of their own pages. Not the transcripts or the examiners’ discussion", "Only after a teacher approves the sheet and the exam’s results are published"],
                ["Parents", "Nothing. Gr8r has no parent accounts", "Never"],
                ["Other schools and organisations on Gr8r", "Nothing from your organisation", "Never"],
                ["Gr8r’s team", "Gr8r’s administrator account can open any organisation’s data, for support. People who run the servers can read the database and files", "At any time. Gr8r doesn’t yet log who viewed which sheet"],
                ["Model providers", "What each model needs for its step (see the next table)", "While marking"],
            ],
        },
        after: [
            { body: "Gr8r sends page images to browsers with instructions not to cache them." },
        ],
    },

    providers: {
        id: "providers",
        heading: "Which model providers see what",
        intro: [
            { body: "Gr8r uses AI models from outside companies for four steps. Which company runs each step is a setting of the Gr8r installation, not of each school; by default all four are Anthropic. On our hosted service, ask us which providers your pilot will use." },
        ],
        table: {
            caption: "The four model steps, what is sent to each, the default provider and the other options.",
            columns: ["Step", "What is sent", "Default provider", "Other options"],
            widths: ["20%", "45%", "15%", "20%"],
            rows: [
                ["Reading pages", "Images of the answer-sheet pages, the question labels, and the start of each question’s text. Also the pages of a question paper or marking scheme you upload to build an exam", "Anthropic", "OpenAI, or a model you host"],
                ["Reading marking schemes", "Question text and marking-scheme text", "Anthropic", "OpenAI, or a model you host"],
                ["Marking", "The question, the marking criteria and the transcript of the student’s answer", "Anthropic", "OpenAI, or a model you host"],
                ["Second examiner", "The same, plus the first model’s marks", "Anthropic", "OpenAI, or a model you host"],
            ],
        },
        list: {
            items: [
                { lead: "Names stay out of prompts.", body: "Gr8r never puts a student’s name, email or roll number into a prompt. A page image is sent as it is, though, so anything written on the page, such as a name on the cover, goes with it." },
                { lead: "Only the page reader sees the pages.", body: "Marking and the second examiner work from the transcript, not the image." },
                { lead: "Fallbacks.", body: "If a model fails, Gr8r can try another, which may be at another provider. Every attempt is recorded. On a self-hosted installation, a setting stops any fallback to an outside provider." },
                { lead: "How long providers keep it.", body: "Each provider keeps what it receives under its own terms for API customers." },
            ],
        },
    },

    retention: {
        id: "retention",
        heading: "How long it is kept, and how to delete it",
        table: {
            caption: "How long Gr8r keeps data today, and how it is deleted.",
            columns: ["What", "Today"],
            widths: ["30%", "70%"],
            rows: [
                ["Automatic deletion", "None. Gr8r doesn’t delete anything automatically today"],
                ["Deleting in the app", "Deleting an exam or a class in Gr8r hides it. The records stay in the database and the files stay on disk"],
                ["Deletion on request", "Your organisation’s owner can ask us to delete your organisation’s data, and we delete it. Until then, files stay on disk"],
                ["Model call records and versions", "Kept as a permanent record by design; deleting them is part of a deletion request"],
            ],
        },
        list: {
            intro: "Not built yet, and planned:",
            items: [
                { body: "retention periods and automatic deletion;" },
                { body: "deleting or exporting one student’s data on request, from within Gr8r;" },
                { body: "a log of who viewed which sheet;" },
                { body: "encryption of files and records by Gr8r itself." },
            ],
        },
        end: [
            { body: "Until these exist, we won’t say that Gr8r has them." },
        ],
    },

    selfHosted: {
        id: "self-hosted",
        heading: "Running Gr8r on your own servers",
        body: [
            { body: "Gr8r can be installed on your own servers, with every model step run on open-weight models you host. With fallback to outside providers switched off, page images and text stay on your servers. We haven’t yet measured how well open-weight models read handwriting and mark, so this option needs testing before you rely on it." },
        ],
    },

    tracing: {
        id: "tracing",
        heading: "The optional tracing tool",
        body: [
            { body: "Gr8r can send a trace of each marking run to Langfuse, a tool for inspecting model calls. It is off unless it is set up. When it is on, page images are masked and never sent; text is sent, including transcripts, marking schemes and feedback. Langfuse can be self-hosted or used from its EU cloud." },
        ],
    },

    website: {
        id: "website",
        heading: "This website",
        table: {
            caption: "Who processes what you send through this website, and why.",
            columns: ["What", "Who processes it", "Why"],
            widths: ["30%", "40%", "30%"],
            rows: [
                ["The pilot request form", "Resend, which emails it to us", "So we can reply to you"],
                ["The bot check on the form", "Cloudflare Turnstile", "To stop spam"],
            ],
        },
        after: [
            { body: "What you send through the form is used only to reply about a pilot. It doesn’t go into Gr8r." },
        ],
    },

    questions: {
        id: "questions",
        heading: "Questions and requests",
        emailLine: "For a question about your data, or to ask us to delete it, write to {email}.",
        noEmail: "For a question about your data, or to ask us to delete it, write to us. Contact details are on their way.",
        address: "Graider, Delhi, India.",
    },
};

export default privacy;

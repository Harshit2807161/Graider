/** Shapes for the pilot page (`/pilot`) and its request form. The general section shapes stay in
 *  types.ts; these are specific to this page. */
import type { Cta, PageMeta, Para } from "./types";

/** One line of the pilot's terms: what it is, and what it means. `list` follows `detail`. */
export interface PilotTerm {
    term: string;
    detail: string;
    list?: string[];
}

/** The pilot's terms as a ruled list of terms and details. */
export interface PilotTermsSection {
    id: string;
    heading: string;
    terms: PilotTerm[];
}

/** A heading, an optional sentence before the list, the list, and an optional sentence after it. */
export interface PilotListSection {
    id: string;
    heading: string;
    intro?: string;
    items: string[];
    after?: string;
}

/** Short notes with a bold lead-in each, and a link after them. */
export interface PilotNotesSection {
    id: string;
    heading: string;
    items: Para[];
    link: Cta;
}

/** The field names the Worker validates (site/worker/src/validate.ts). */
export type PilotFieldName =
    | "name"
    | "role"
    | "institution"
    | "institutionType"
    | "city"
    | "email"
    | "phone"
    | "exam"
    | "sheets"
    | "message";

export interface PilotFieldOption {
    /** The value sent to the Worker */
    value: string;
    label: string;
}

/** One field of the form. Length limits come from the Worker, not from here. */
export interface PilotField {
    name: PilotFieldName;
    label: string;
    kind: "text" | "email" | "tel" | "select" | "textarea";
    required: boolean;
    help?: string;
    options?: PilotFieldOption[];
    autoComplete?: string;
    inputMode?: "text" | "email" | "tel" | "numeric";
    /** Span both columns of the form's grid at wider widths */
    wide?: boolean;
}

/** Words for the request form. `{email}` is replaced with the contact address. */
export interface PilotFormContent {
    id: string;
    heading: string;
    intro: string;
    fields: PilotField[];
    /** After an optional field's label */
    optional: string;
    /** The first, empty choice of a select */
    choose: string;
    /** The hidden honeypot field's label (never shown or announced) */
    trap: string;
    submit: string;
    /** Said to screen readers while the request is on its way */
    sending: string;
    errors: {
        required: string;
        email: string;
        /** The Worker's own wording for a bad phone number */
        phone: string;
        /** Above the button when fields need fixing */
        check: string;
        turnstile: string;
        sendFailed: string;
        sendFailedEmail: string;
    };
    /** Shown when the site was built without the endpoint or the Turnstile key */
    unavailable: { withEmail: string; withoutEmail: string };
    success: { heading: string; body: string; bodyWithEmail: string };
    /** Under the form: the text, then "{see} {link}." */
    privacy: { text: string; see: string; link: Cta };
}

export interface PilotContent {
    meta: PageMeta;
    title: string;
    lede: string;
    /** The first screen's link down to the form */
    jump: Cta;
    terms: PilotTermsSection;
    ask: PilotListSection;
    judge: PilotListSection;
    notes: PilotNotesSection;
    form: PilotFormContent;
}

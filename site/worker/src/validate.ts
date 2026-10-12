export const INSTITUTION_TYPES = ["school", "coaching", "college", "other"] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export interface PilotRequest {
    name: string;
    role: string;
    institution: string;
    institutionType: InstitutionType;
    city: string;
    email: string;
    phone: string | null;
    exam: string;
    sheets: string;
    message: string | null;
    turnstileToken: string;
}

export type ValidationResult =
    | { ok: true; value: PilotRequest }
    | { ok: false; errors: Record<string, string> };

/** Maximum lengths, in characters, after trimming. */
export const LIMITS = {
    name: 100,
    role: 100,
    institution: 150,
    city: 100,
    email: 254,
    phone: 20,
    exam: 200,
    sheets: 50,
    message: 2000,
    turnstileToken: 2048, // Cloudflare's documented maximum token length
} as const;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// The message may contain line breaks and tabs; nothing else below 0x20.
// eslint-disable-next-line no-control-regex
const MESSAGE_CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const EMAIL_RE =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/**
 * Email shape check: one address, ASCII, a dotted domain. It is deliberately
 * not a full RFC 5322 parser (no quoted local parts, no internationalised
 * addresses); the acknowledgement email bouncing is the real test.
 */
export function isValidEmail(value: string): boolean {
    if (value.length > LIMITS.email) return false;
    if (!EMAIL_RE.test(value)) return false;
    const local = value.slice(0, value.indexOf("@"));
    if (local.length > 64) return false;
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
    return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when the honeypot field `website` has been filled in (a bot). */
export function isHoneypotFilled(input: unknown): boolean {
    if (!isRecord(input)) return false;
    const website = input.website;
    if (website === undefined || website === null) return false;
    if (typeof website === "string") return website.trim().length > 0;
    return true; // any non-string, non-empty value is not what the form sends
}

function text(
    input: Record<string, unknown>,
    key: keyof typeof LIMITS,
    errors: Record<string, string>,
    opts: { required: boolean; multiline?: boolean; allowNumber?: boolean } = { required: true },
): string | null {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") {
        if (opts.required) errors[key] = "Required.";
        return null;
    }
    // "sheets" may arrive as a number from a number input; no other field takes one.
    const asString = opts.allowNumber && typeof raw === "number" && Number.isFinite(raw) ? String(raw) : raw;
    if (typeof asString !== "string") {
        errors[key] = "Must be text.";
        return null;
    }
    const value = asString.trim();
    if (value.length === 0) {
        if (opts.required) errors[key] = "Required.";
        return null;
    }
    if (value.length > LIMITS[key]) {
        errors[key] = `Must be at most ${LIMITS[key]} characters.`;
        return null;
    }
    if ((opts.multiline ? MESSAGE_CONTROL_CHARS : CONTROL_CHARS).test(value)) {
        errors[key] = "Contains characters that are not allowed.";
        return null;
    }
    return value;
}

/** Validate and normalise the body of POST /pilot. Does not check the honeypot. */
export function validatePilotRequest(input: unknown): ValidationResult {
    if (!isRecord(input)) {
        return { ok: false, errors: { body: "Expected a JSON object." } };
    }
    const errors: Record<string, string> = {};

    const name = text(input, "name", errors);
    const role = text(input, "role", errors);
    const institution = text(input, "institution", errors);
    const city = text(input, "city", errors);
    const exam = text(input, "exam", errors);
    const sheets = text(input, "sheets", errors, { required: true, allowNumber: true });
    const message = text(input, "message", errors, { required: false, multiline: true });
    const turnstileToken = text(input, "turnstileToken", errors);

    const type = input.institutionType;
    let institutionType: InstitutionType | null = null;
    if (typeof type === "string" && (INSTITUTION_TYPES as readonly string[]).includes(type)) {
        institutionType = type as InstitutionType;
    } else {
        errors.institutionType = `Must be one of: ${INSTITUTION_TYPES.join(", ")}.`;
    }

    const email = text(input, "email", errors);
    if (email !== null && !isValidEmail(email)) {
        errors.email = "Enter a valid email address.";
    }

    const phone = text(input, "phone", errors, { required: false });
    if (phone !== null) {
        const digits = phone.replace(/\D/g, "");
        if (!/^[0-9+()\-.\s]+$/.test(phone) || digits.length < 7) {
            errors.phone = "Enter a valid phone number or leave it empty.";
        }
    }

    if (
        Object.keys(errors).length > 0 ||
        name === null ||
        role === null ||
        institution === null ||
        institutionType === null ||
        city === null ||
        email === null ||
        exam === null ||
        sheets === null ||
        turnstileToken === null
    ) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            name,
            role,
            institution,
            institutionType,
            city,
            email,
            phone,
            exam,
            sheets,
            message,
            turnstileToken,
        },
    };
}

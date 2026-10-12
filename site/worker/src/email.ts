import type { PilotRequest } from "./validate";

export const RESEND_URL = "https://api.resend.com/emails";

export interface OutgoingEmail {
    from: string;
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; status: number; name: string };

/** One line, no control characters, trimmed to `max` characters. For subjects and greetings. */
export function oneLine(value: string, max: number): string {
    // eslint-disable-next-line no-control-regex
    const cleaned = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").trim();
    return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

/** Plain-text body of the email Kirtan receives. */
export function buildNotificationText(req: PilotRequest): string {
    return [
        "New pilot request",
        "",
        `Name: ${req.name}`,
        `Role: ${req.role}`,
        `Institution: ${req.institution} (${req.institutionType})`,
        `City: ${req.city}`,
        `Email: ${req.email}`,
        `Phone: ${req.phone ?? "not given"}`,
        `Exam to pilot on: ${req.exam}`,
        `Roughly how many answer sheets: ${req.sheets}`,
        "",
        "Message:",
        req.message ?? "(none)",
        "",
        "Reply to this email to answer the requester.",
        "",
    ].join("\n");
}

export function buildNotificationSubject(req: PilotRequest): string {
    return oneLine(`Pilot request: ${req.institution}, ${req.city}`, 150);
}

/** Plain-text acknowledgement for the requester. No marketing. */
export function buildAcknowledgementText(req: PilotRequest): string {
    return [
        `Hi ${oneLine(req.name, 100)},`,
        "",
        "Thanks for asking about a Gr8r pilot. We read every request, and Kirtan replies within a few days.",
        "",
        "Your details are used only to reply to you. Resend delivers this email for us.",
        "",
        "Gr8r",
        "",
    ].join("\n");
}

export const ACKNOWLEDGEMENT_SUBJECT = "We received your Gr8r pilot request";

/**
 * Send one email through Resend's REST API. Never throws and never returns
 * the API key or the raw upstream body (only Resend's error `name`).
 */
export async function sendEmail(apiKey: string, email: OutgoingEmail): Promise<SendResult> {
    const payload: Record<string, unknown> = {
        from: email.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
    };
    if (email.replyTo) payload.reply_to = [email.replyTo];

    try {
        const res = await fetch(RESEND_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10_000),
        });
        let json: { id?: unknown; name?: unknown } = {};
        try {
            json = (await res.json()) as typeof json;
        } catch {
            // Non-JSON body: fall through with the status code only.
        }
        if (res.ok) {
            return { ok: true, id: typeof json.id === "string" ? json.id : null };
        }
        return { ok: false, status: res.status, name: typeof json.name === "string" ? json.name : "unknown" };
    } catch {
        return { ok: false, status: 0, name: "network_error" };
    }
}

import { corsHeaders, isAllowedOrigin, parseAllowedOrigins } from "./cors";
import {
    ACKNOWLEDGEMENT_SUBJECT,
    buildAcknowledgementText,
    buildNotificationSubject,
    buildNotificationText,
    sendEmail,
} from "./email";
import { allowRequest, RATE_PERIOD_SECONDS } from "./ratelimit";
import type { Env } from "./types";
import { verifyTurnstile } from "./turnstile";
import { isHoneypotFilled, validatePilotRequest } from "./validate";

const MAX_BODY_BYTES = 16 * 1024;
const PLACEHOLDER = "CHANGE_ME";

function log(event: string, fields: Record<string, unknown> = {}): void {
    // Never log secrets, tokens or the requester's details.
    console.log(JSON.stringify({ event, ...fields }));
}

function json(body: Record<string, unknown>, status: number, cors: Record<string, string>, extra: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...cors,
            ...extra,
        },
    });
}

function fail(status: number, error: string, cors: Record<string, string>, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response {
    return json({ ok: false, error, ...extra }, status, cors, headers);
}

/** Names of settings that are missing or still the placeholder value. */
export function missingConfig(env: Env): string[] {
    const dryRun = env.EMAIL_DRY_RUN === "true";
    const required: Array<[string, string | undefined]> = [
        ["TURNSTILE_SECRET_KEY", env.TURNSTILE_SECRET_KEY],
        ["FROM_EMAIL", env.FROM_EMAIL],
        ["TO_EMAIL", env.TO_EMAIL],
        ["ALLOWED_ORIGINS", env.ALLOWED_ORIGINS],
    ];
    if (!dryRun) required.push(["RESEND_API_KEY", env.RESEND_API_KEY]);
    // Only the two addresses are checked for the CHANGE_ME placeholder; a stale
    // placeholder inside ALLOWED_ORIGINS is harmless (it never matches an Origin).
    const placeholderChecked = new Set(["FROM_EMAIL", "TO_EMAIL"]);
    return required
        .filter(([name, v]) => !v || v.trim() === "" || (placeholderChecked.has(name) && v.includes(PLACEHOLDER)))
        .map(([name]) => name);
}

async function readJsonBody(request: Request): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
    const declared = Number(request.headers.get("Content-Length") ?? "0");
    if (declared > MAX_BODY_BYTES) return { ok: false, status: 413, error: "Request body is too large." };
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return { ok: false, status: 413, error: "Request body is too large." };
    try {
        return { ok: true, data: JSON.parse(raw) };
    } catch {
        return { ok: false, status: 400, error: "Body must be valid JSON." };
    }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(origin, allowed);

    if (url.pathname === "/health" && (request.method === "GET" || request.method === "HEAD")) {
        return json({ ok: true }, 200, {});
    }

    if (url.pathname !== "/pilot") {
        return fail(404, "Not found.", {});
    }

    // A browser sending an Origin we do not know is refused outright (this also
    // stops cross-site form posts from other pages). Requests without an
    // Origin header (curl, server-side tests) are allowed; Turnstile still applies.
    if (origin !== null && !isAllowedOrigin(origin, allowed)) {
        return fail(403, "Origin not allowed.", {});
    }

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { ...cors, "Cache-Control": "no-store" } });
    }
    if (request.method !== "POST") {
        return fail(405, "Method not allowed.", cors, {}, { Allow: "POST, OPTIONS" });
    }

    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
        return fail(415, "Content-Type must be application/json.", cors);
    }

    const missing = missingConfig(env);
    if (missing.length > 0) {
        log("misconfigured", { missing });
        return fail(500, "The server is not configured yet.", cors);
    }

    const ip = request.headers.get("CF-Connecting-IP");
    if (!(await allowRequest(env, ip ?? "unknown"))) {
        log("rate_limited");
        return fail(429, "Too many requests. Please try again in a minute.", cors, {}, { "Retry-After": String(RATE_PERIOD_SECONDS) });
    }

    const body = await readJsonBody(request);
    if (!body.ok) return fail(body.status, body.error, cors);

    // Honeypot: pretend it worked so the bot learns nothing, send nothing.
    if (isHoneypotFilled(body.data)) {
        log("honeypot");
        return json({ ok: true }, 200, cors);
    }

    const parsed = validatePilotRequest(body.data);
    if (!parsed.ok) {
        return fail(422, "Please check the highlighted fields.", cors, { fields: parsed.errors });
    }
    const pilot = parsed.value;

    const hostnames = (env.TURNSTILE_HOSTNAMES ?? "")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);
    const verdict = await verifyTurnstile(pilot.turnstileToken, env.TURNSTILE_SECRET_KEY, ip, hostnames);
    if (!verdict.ok) {
        if (verdict.reason === "unavailable") {
            log("turnstile_unavailable");
            return fail(502, "Could not verify you are human right now. Please try again.", cors);
        }
        log("turnstile_rejected", { codes: verdict.codes });
        return fail(403, "Verification failed. Please reload the page and try again.", cors);
    }

    const from = env.FROM_EMAIL;
    const to = env.TO_EMAIL;

    if (env.EMAIL_DRY_RUN === "true") {
        log("email_dry_run", { institutionType: pilot.institutionType });
        return json({ ok: true }, 200, cors);
    }

    const main = await sendEmail(env.RESEND_API_KEY, {
        from,
        to,
        subject: buildNotificationSubject(pilot),
        text: buildNotificationText(pilot),
        replyTo: pilot.email,
    });
    if (!main.ok) {
        log("resend_failed", { which: "notification", status: main.status, name: main.name });
        const status = main.status === 429 ? 503 : 502;
        return fail(status, "We could not send your request just now. Please try again in a few minutes.", cors);
    }

    // The acknowledgement is a courtesy. The request already reached us, so a
    // failure here (for example Resend's test domain only mails the account
    // owner) is logged and does not fail the form.
    const ack = await sendEmail(env.RESEND_API_KEY, {
        from,
        to: pilot.email,
        subject: ACKNOWLEDGEMENT_SUBJECT,
        text: buildAcknowledgementText(pilot),
        replyTo: to,
    });
    if (!ack.ok) {
        log("resend_failed", { which: "acknowledgement", status: ack.status, name: ack.name });
    }

    log("pilot_request_sent", { institutionType: pilot.institutionType, acknowledged: ack.ok });
    return json({ ok: true }, 200, cors);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        try {
            return await handleRequest(request, env);
        } catch (err) {
            log("unhandled_error", { message: err instanceof Error ? err.message : String(err) });
            return fail(500, "Something went wrong.", {});
        }
    },
} satisfies ExportedHandler<Env>;

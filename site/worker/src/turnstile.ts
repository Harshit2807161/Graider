export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The action the form's widget sets with data-action="pilot". */
export const EXPECTED_ACTION = "pilot";

export type TurnstileResult =
    | { ok: true }
    | { ok: false; reason: "rejected"; codes: string[] }
    | { ok: false; reason: "unavailable" };

interface SiteverifyResponse {
    success?: boolean;
    hostname?: string;
    action?: string;
    "error-codes"?: string[];
}

/**
 * Verify a Turnstile token with Cloudflare. Fails closed: any network error,
 * non-2xx status or unparsable body is "unavailable", never a pass.
 *
 * `allowedHostnames` (optional) must contain the hostname Cloudflare reports
 * for the page that solved the challenge.
 */
export async function verifyTurnstile(
    token: string,
    secret: string,
    ip: string | null,
    allowedHostnames: string[] = [],
): Promise<TurnstileResult> {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    let data: SiteverifyResponse;
    try {
        const res = await fetch(SITEVERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return { ok: false, reason: "unavailable" };
        data = (await res.json()) as SiteverifyResponse;
    } catch {
        return { ok: false, reason: "unavailable" };
    }

    if (data.success !== true) {
        return { ok: false, reason: "rejected", codes: data["error-codes"] ?? [] };
    }
    if (typeof data.action === "string" && data.action !== "" && data.action !== EXPECTED_ACTION) {
        return { ok: false, reason: "rejected", codes: ["action-mismatch"] };
    }
    if (allowedHostnames.length > 0) {
        const host = (data.hostname ?? "").toLowerCase();
        if (!allowedHostnames.includes(host)) {
            return { ok: false, reason: "rejected", codes: ["hostname-mismatch"] };
        }
    }
    return { ok: true };
}

import type { Env } from "./types";

/** Per-IP limit: 5 requests per 60 seconds (Cloudflare's binding allows periods of 10 or 60 seconds). */
export const RATE_LIMIT = 5;
export const RATE_PERIOD_SECONDS = 60;

// Best-effort fallback used only when the PILOT_LIMITER binding is missing.
// It lives in one isolate's memory, so it is per-isolate: another isolate (or
// another Cloudflare location) has its own counts, and a restart clears them.
// It slows a single noisy client, it does not guarantee a global limit.
const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export function resetInMemoryLimiter(): void {
    hits.clear();
}

function inMemoryAllow(key: string, now: number): boolean {
    const windowStart = now - RATE_PERIOD_SECONDS * 1000;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= RATE_LIMIT) {
        hits.set(key, recent);
        return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > MAX_TRACKED_KEYS) {
        for (const [k, times] of hits) {
            if (times.every((t) => t <= windowStart)) hits.delete(k);
        }
    }
    return true;
}

/**
 * Returns true when the request may proceed.
 *
 * Uses the Workers Rate Limiting binding when configured. It is per Cloudflare
 * location and eventually consistent ("not an accurate accounting system" in
 * the docs), which is fine for stopping a form from being hammered. If the
 * binding throws, the request is let through (Turnstile still guards it).
 */
export async function allowRequest(env: Env, ip: string, now = Date.now()): Promise<boolean> {
    if (env.PILOT_LIMITER) {
        try {
            const { success } = await env.PILOT_LIMITER.limit({ key: ip });
            return success;
        } catch (err) {
            console.log(JSON.stringify({ event: "rate_limit_binding_error", message: String(err) }));
            return true;
        }
    }
    return inMemoryAllow(ip, now);
}

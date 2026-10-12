import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleRequest, missingConfig } from "../src";
import { RATE_LIMIT, resetInMemoryLimiter } from "../src/ratelimit";
import type { Env } from "../src/types";

const ORIGIN = "http://localhost:3100";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND = "https://api.resend.com/emails";

const env: Env = {
    TURNSTILE_SECRET_KEY: "turnstile-secret-value",
    RESEND_API_KEY: "re_secret_value",
    FROM_EMAIL: "Gr8r <pilots@gr8r.example>",
    TO_EMAIL: "kirtan@gr8r.example",
    ALLOWED_ORIGINS: `${ORIGIN}, https://gr8r.example/`,
};

const form = {
    name: "Asha Verma",
    role: "Head of Science",
    institution: "Sunrise Public School",
    institutionType: "school",
    city: "Pune",
    email: "asha@sunrise.example",
    phone: "+91 98765 43210",
    exam: "Class X Science pre-board",
    sheets: "300",
    message: "We would like to try it.",
    turnstileToken: "token-123",
    website: "",
};

interface Call {
    url: string;
    init: RequestInit;
}

let calls: Call[];
let siteverify: () => Response | Promise<Response>;
let resend: (n: number) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
    calls = [];
    resetInMemoryLimiter();
    siteverify = () => jsonResponse({ success: true, hostname: "localhost", action: "pilot" });
    resend = () => jsonResponse({ id: "email-id" });
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === SITEVERIFY) return siteverify();
            if (url === RESEND) return resend(calls.filter((c) => c.url === RESEND).length);
            throw new Error(`unexpected fetch ${url}`);
        }),
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function post(body: unknown, headers: Record<string, string> = {}, raw = false): Request {
    return new Request("https://pilot.example.workers.dev/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.7", ...headers },
        body: raw ? (body as string) : JSON.stringify(body),
    });
}

const resendCalls = () => calls.filter((c) => c.url === RESEND);
const resendBody = (i: number) => JSON.parse(String(resendCalls()[i]?.init.body)) as Record<string, unknown>;

describe("GET /health", () => {
    it("returns 200", async () => {
        const res = await handleRequest(new Request("https://x.example/health"), env);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
    });
});

describe("routing and CORS", () => {
    it("answers the preflight for an allowed origin", async () => {
        const res = await handleRequest(
            new Request("https://x.example/pilot", { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } }),
            env,
        );
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
        expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
        expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    });

    it("normalises a trailing slash in ALLOWED_ORIGINS", async () => {
        const res = await handleRequest(post(form, { Origin: "https://gr8r.example" }), env);
        expect(res.status).toBe(200);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://gr8r.example");
    });

    it("refuses a preflight and a POST from another origin", async () => {
        const pre = await handleRequest(new Request("https://x.example/pilot", { method: "OPTIONS", headers: { Origin: "https://evil.example" } }), env);
        expect(pre.status).toBe(403);
        expect(pre.headers.get("Access-Control-Allow-Origin")).toBeNull();
        const res = await handleRequest(post(form, { Origin: "https://evil.example" }), env);
        expect(res.status).toBe(403);
        expect(calls).toHaveLength(0);
    });

    it("allows a request with no Origin header (curl)", async () => {
        const req = new Request("https://x.example/pilot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const res = await handleRequest(req, env);
        expect(res.status).toBe(200);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("404s unknown paths and 405s other methods on /pilot", async () => {
        expect((await handleRequest(new Request("https://x.example/nope"), env)).status).toBe(404);
        const res = await handleRequest(new Request("https://x.example/pilot", { method: "GET" }), env);
        expect(res.status).toBe(405);
        expect(res.headers.get("Allow")).toContain("POST");
    });

    it("requires a JSON content type and valid JSON", async () => {
        expect((await handleRequest(post("a=b", { "Content-Type": "text/plain" }, true), env)).status).toBe(415);
        expect((await handleRequest(post("{not json", {}, true), env)).status).toBe(400);
    });

    it("rejects an oversized body", async () => {
        const res = await handleRequest(post({ ...form, message: "x".repeat(40_000) }), env);
        expect(res.status).toBe(413);
    });
});

describe("POST /pilot", () => {
    it("verifies Turnstile with the secret and client IP, then sends both emails", async () => {
        const res = await handleRequest(post(form), env);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);

        const verify = calls[0]!;
        expect(verify.url).toBe(SITEVERIFY);
        const sent = new URLSearchParams(String(verify.init.body));
        expect(sent.get("secret")).toBe("turnstile-secret-value");
        expect(sent.get("response")).toBe("token-123");
        expect(sent.get("remoteip")).toBe("203.0.113.7");

        expect(resendCalls()).toHaveLength(2);
        const headers = resendCalls()[0]!.init.headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer re_secret_value");

        const main = resendBody(0);
        expect(main.from).toBe(env.FROM_EMAIL);
        expect(main.to).toEqual([env.TO_EMAIL]);
        expect(main.reply_to).toEqual([form.email]);
        const text = String(main.text);
        for (const part of [form.name, form.role, form.institution, "school", form.city, form.email, form.phone, form.exam, form.sheets, form.message]) {
            expect(text).toContain(part);
        }
        expect(String(main.subject)).toContain("Sunrise Public School");

        const ack = resendBody(1);
        expect(ack.to).toEqual([form.email]);
        expect(ack.reply_to).toEqual([env.TO_EMAIL]);
        expect(String(ack.text)).toContain("Kirtan replies within a few days");
        expect(String(ack.text)).toContain("Resend delivers this email");
        expect(ack.html).toBeUndefined();
    });

    it("never puts a secret in the response body", async () => {
        const ok = await (await handleRequest(post(form), env)).text();
        siteverify = () => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] });
        const bad = await (await handleRequest(post(form), env)).text();
        for (const body of [ok, bad]) {
            expect(body).not.toContain("turnstile-secret-value");
            expect(body).not.toContain("re_secret_value");
        }
    });

    it("returns 422 with field errors and calls nothing", async () => {
        const res = await handleRequest(post({ ...form, email: "nope", city: "" }), env);
        expect(res.status).toBe(422);
        const body = (await res.json()) as { ok: boolean; error: string; fields: Record<string, string> };
        expect(body.ok).toBe(false);
        expect(body.fields.email).toBeDefined();
        expect(body.fields.city).toBeDefined();
        expect(calls).toHaveLength(0);
    });

    it("silently accepts a filled honeypot without verifying or sending", async () => {
        const res = await handleRequest(post({ ...form, website: "http://spam.example" }), env);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(calls).toHaveLength(0);
    });

    it("returns 403 and sends nothing when Turnstile rejects the token", async () => {
        siteverify = () => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] });
        const res = await handleRequest(post(form), env);
        expect(res.status).toBe(403);
        expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
        expect(resendCalls()).toHaveLength(0);
    });

    it("fails closed with 502 when siteverify is down or returns garbage", async () => {
        siteverify = () => new Response("oops", { status: 500 });
        expect((await handleRequest(post(form), env)).status).toBe(502);
        siteverify = () => new Response("<html>", { status: 200 });
        expect((await handleRequest(post(form), env)).status).toBe(502);
        siteverify = () => {
            throw new Error("network");
        };
        expect((await handleRequest(post(form), env)).status).toBe(502);
        expect(resendCalls()).toHaveLength(0);
    });

    it("rejects a token issued for another action or hostname", async () => {
        siteverify = () => jsonResponse({ success: true, hostname: "localhost", action: "login" });
        expect((await handleRequest(post(form), env)).status).toBe(403);
        siteverify = () => jsonResponse({ success: true, hostname: "evil.example", action: "pilot" });
        expect((await handleRequest(post(form), { ...env, TURNSTILE_HOSTNAMES: "localhost,gr8r.example" })).status).toBe(403);
        expect((await handleRequest(post(form), { ...env, TURNSTILE_HOSTNAMES: "evil.example" })).status).toBe(200);
    });

    it("returns 502 when the notification email fails, and does not send the acknowledgement", async () => {
        resend = () => jsonResponse({ name: "validation_error", message: "secret detail" }, 403);
        const res = await handleRequest(post(form), env);
        expect(res.status).toBe(502);
        expect(await res.text()).not.toContain("secret detail");
        expect(resendCalls()).toHaveLength(1);
    });

    it("maps a Resend rate limit to 503", async () => {
        resend = () => jsonResponse({ name: "rate_limit_exceeded" }, 429);
        expect((await handleRequest(post(form), env)).status).toBe(503);
    });

    it("still succeeds when only the acknowledgement fails", async () => {
        resend = (n) => (n === 1 ? jsonResponse({ id: "1" }) : jsonResponse({ name: "validation_error" }, 403));
        const res = await handleRequest(post(form), env);
        expect(res.status).toBe(200);
        expect(resendCalls()).toHaveLength(2);
    });

    it("skips Resend in dry-run mode", async () => {
        const res = await handleRequest(post(form), { ...env, EMAIL_DRY_RUN: "true", RESEND_API_KEY: "" });
        expect(res.status).toBe(200);
        expect(calls).toHaveLength(1);
        expect(calls[0]!.url).toBe(SITEVERIFY);
    });

    it("answers 500 when configuration is missing or still a placeholder", async () => {
        expect(missingConfig({ ...env, RESEND_API_KEY: "" })).toEqual(["RESEND_API_KEY"]);
        const res = await handleRequest(post(form), { ...env, TO_EMAIL: "CHANGE_ME@your-inbox.example" });
        expect(res.status).toBe(500);
        expect(calls).toHaveLength(0);
        const text = await res.text();
        expect(text).not.toContain("TO_EMAIL");
    });
});

describe("rate limiting", () => {
    it("uses the Workers binding keyed by IP when present", async () => {
        const limit = vi.fn(async () => ({ success: true }));
        const res = await handleRequest(post(form), { ...env, PILOT_LIMITER: { limit } });
        expect(res.status).toBe(200);
        expect(limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
    });

    it("returns 429 with Retry-After when the binding says no, before any outbound call", async () => {
        const limit = vi.fn(async () => ({ success: false }));
        const res = await handleRequest(post(form), { ...env, PILOT_LIMITER: { limit } });
        expect(res.status).toBe(429);
        expect(res.headers.get("Retry-After")).toBe("60");
        expect(calls).toHaveLength(0);
    });

    it("lets requests through if the binding itself errors", async () => {
        const limit = vi.fn(async () => {
            throw new Error("binding down");
        });
        expect((await handleRequest(post(form), { ...env, PILOT_LIMITER: { limit } })).status).toBe(200);
    });

    it("falls back to a per-isolate in-memory limiter without the binding", async () => {
        for (let i = 0; i < RATE_LIMIT; i++) {
            expect((await handleRequest(post(form), env)).status).toBe(200);
        }
        expect((await handleRequest(post(form), env)).status).toBe(429);
        // A different IP has its own budget.
        expect((await handleRequest(post(form, { "CF-Connecting-IP": "198.51.100.9" }), env)).status).toBe(200);
    });
});

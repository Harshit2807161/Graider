# Gr8r pilot-request Worker

A small Cloudflare Worker that receives the "Request a pilot" form from the static site (`site/`). For each request it:

1. checks the browser origin (CORS allow-list) and a per-IP rate limit,
2. validates the fields in code and drops honeypot hits,
3. verifies the Cloudflare Turnstile token (siteverify, with the client IP),
4. emails the request to you through Resend, with the requester as reply-to,
5. sends the requester a short plain-text acknowledgement.

Plain `fetch` handler, TypeScript, no framework. Nothing is stored: the email is the record.

```
POST /pilot    JSON body, see below   -> { "ok": true }  or  { "ok": false, "error": "...", "fields"?: {...} }
GET  /health   -> 200 { "ok": true }
OPTIONS /pilot CORS preflight (allowed origins only)
```

Request body:

```json
{
  "name": "Asha Verma",
  "role": "Head of Science",
  "institution": "Sunrise Public School",
  "institutionType": "school",
  "city": "Pune",
  "email": "asha@sunrise.example",
  "phone": "+91 98765 43210",
  "exam": "Class X Science pre-board",
  "sheets": "300",
  "message": "Optional free text",
  "turnstileToken": "<value of cf-turnstile-response>",
  "website": ""
}
```

`institutionType` is `school`, `coaching`, `college` or `other`. `phone` and `message` are optional. `website` is a honeypot: leave it empty (hide the input from people). If it is filled the Worker answers `{ "ok": true }` and does nothing.

Status codes: 200 sent (or honeypot), 400 bad JSON, 403 origin not allowed / Turnstile rejected, 404, 405, 413 body over 16 KB, 415 not JSON, 422 field errors (`fields` lists them), 429 rate limited (`Retry-After: 60`), 500 not configured, 502 Turnstile or Resend unavailable, 503 Resend rate limit.

Files: `src/index.ts` (handler), `src/validate.ts`, `src/turnstile.ts`, `src/email.ts`, `src/ratelimit.ts`, `src/cors.ts`, `test/`, `wrangler.jsonc`, `.dev.vars.example`.

## Set it up from scratch

You need Node.js 20 or newer. Everything below runs inside `site/worker/`.

### 1. Create a Cloudflare account

Sign up (free) at <https://dash.cloudflare.com/sign-up> and confirm your email. You do not need a domain or a credit card for Workers or Turnstile.

### 2. Install

```bash
cd site/worker
npm install
```

If npm reports that install scripts for `esbuild` or `workerd` were blocked, run `npm install-scripts approve esbuild workerd` and `npm install` again (`package.json` already lists them in `allowScripts`).

### 3. Log in to Cloudflare from the terminal

```bash
npx wrangler login
```

A browser tab opens; click Allow. `npx wrangler whoami` shows the account. (Local development with `wrangler dev` works without logging in; deploying and setting secrets need it.)

### 4. Create a Turnstile widget

1. Cloudflare dashboard -> **Turnstile** -> **Add widget**.
2. Widget name: `Gr8r pilot form`.
3. Hostname management: add the domain the site is served from (for example `gr8r.example`; add `www.` too if both are used) and `localhost` for development. Use the bare hostname, no `https://`, no port.
4. Widget mode: **Managed** (recommended). Click **Create**.
5. Copy the **Site key** (public, goes into the site) and the **Secret key** (private, goes into the Worker as a secret). Never put the secret in the site or in git.

Turnstile also publishes test keys that work on any host, including `localhost` and 127.0.0.1: site key `1x00000000000000000000AA` (always passes) with secret `1x0000000000000000000000000000000AA`. `.dev.vars.example` uses them. The widget generates the dummy token `XXXX.DUMMY.TOKEN.XXXX`, which only the test secrets accept, so never deploy a test secret with a real site key or the other way round.

### 5. Resend: API key and sending address

1. Sign up at <https://resend.com> (free).
2. **API Keys** -> **Create API Key**, permission "Sending access", copy the key (it starts with `re_`). It is shown once.
3. Pick a sender:
   - **Testing, no domain needed:** `onboarding@resend.dev` (already the default `FROM_EMAIL`). Resend only delivers test mail from this address to the email address of your own Resend account, so set `TO_EMAIL` to that address. The acknowledgement to a requester is then refused by Resend; the Worker logs it and still returns `{ ok: true }`.
   - **For real use:** **Domains** -> **Add Domain**, ideally a subdomain such as `mail.gr8r.example`, add the DNS records Resend shows (SPF, DKIM, and so on) at your DNS host, and press Verify. Then set `FROM_EMAIL` to something like `Gr8r <pilots@mail.gr8r.example>`.

### 6. Edit the non-secret settings

In `wrangler.jsonc` under `vars`:

| Var | What to put |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated origins of the site, no trailing slash, no path: `https://gr8r.example,http://localhost:3100`. Replace the `CHANGE_ME` entry. |
| `FROM_EMAIL` | Sender on a verified Resend domain, or `Gr8r <onboarding@resend.dev>` while testing. |
| `TO_EMAIL` | The inbox that receives pilot requests. Replace `CHANGE_ME@your-inbox.example`. |

Until `TO_EMAIL` and `FROM_EMAIL` are changed from the `CHANGE_ME` placeholder (and the secrets exist) the Worker answers 500 "not configured" instead of sending.

Optional var: `TURNSTILE_HOSTNAMES` (comma-separated). If set, Turnstile must report one of these page hostnames, for example `gr8r.example`. Leave it unset while using test keys.

### 7. Run it locally

```bash
cp .dev.vars.example .dev.vars     # git-ignored; holds the test Turnstile secret and EMAIL_DRY_RUN=true
npm run dev                        # http://localhost:8787
```

With `EMAIL_DRY_RUN=true` the Worker validates and verifies the Turnstile token for real but does not call Resend. To send real mail locally, delete that line and put your real `RESEND_API_KEY` in `.dev.vars`.

In a second terminal:

```bash
curl -i http://localhost:8787/health

curl -i -X POST http://localhost:8787/pilot \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3100' \
  -d '{
    "name": "Asha Verma",
    "role": "Head of Science",
    "institution": "Sunrise Public School",
    "institutionType": "school",
    "city": "Pune",
    "email": "asha@sunrise.example",
    "exam": "Class X Science pre-board",
    "sheets": "300",
    "turnstileToken": "XXXX.DUMMY.TOKEN.XXXX",
    "website": ""
  }'
# HTTP/1.1 200 OK   {"ok":true}
```

The local rate limit is 5 requests per 60 seconds per IP, so a 429 after a few tries is expected; wait a minute.

Checks: `npm test` (validation and handler tests with Turnstile and Resend mocked) and `npm run typecheck`.

### 8. Deploy

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY   # paste the real Turnstile secret when prompted
npx wrangler secret put RESEND_API_KEY         # paste the re_... key when prompted
npm run deploy
```

`wrangler secret put` asks for the value interactively, so it never lands in your shell history. The first deploy may ask you to choose a `workers.dev` subdomain. Wrangler prints the URL, for example `https://gr8r-pilot.<your-subdomain>.workers.dev`. A 523 error in the first minute after the first deploy goes away by itself. Check it: `curl https://gr8r-pilot.<your-subdomain>.workers.dev/health`. Watch logs with `npx wrangler tail`.

If `wrangler deploy` rejects the `ratelimits` block for your plan, delete that block from `wrangler.jsonc`. The Worker then uses the in-memory fallback.

A custom domain such as `api.gr8r.example/pilot` can be added later under the Worker's Settings -> Domains & Routes in the dashboard; then change `NEXT_PUBLIC_PILOT_ENDPOINT`.

## Calling it from the static site

The site reads two build-time variables (in `site/.env.local` for dev, and in the host's build settings for production):

```bash
NEXT_PUBLIC_PILOT_ENDPOINT=https://gr8r-pilot.<your-subdomain>.workers.dev/pilot   # http://localhost:8787/pilot in dev
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>                                           # 1x00000000000000000000AA in dev
```

For local dev with the Next dev server on port 3100 (`npm run dev -- -p 3100`), `http://localhost:3100` is already in `ALLOWED_ORIGINS`.

Load the Turnstile script once, with the exact URL (do not proxy or self-host it):

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<!-- plain HTML: implicit rendering; adds a hidden input named cf-turnstile-response to the form -->
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY" data-action="pilot"></div>
```

In a React page the widget div usually mounts after the script has already scanned the page, so render it explicitly. Load the script with `?render=explicit` and use a client component like this:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        turnstile?: {
            render(el: HTMLElement, opts: Record<string, unknown>): string;
            reset(id?: string): void;
        };
    }
}

const ENDPOINT = process.env.NEXT_PUBLIC_PILOT_ENDPOINT!;
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

export function PilotForm() {
    const box = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | undefined>(undefined);
    const [token, setToken] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        const mount = () => {
            if (box.current && window.turnstile && widgetId.current === undefined) {
                widgetId.current = window.turnstile.render(box.current, {
                    sitekey: SITE_KEY,
                    action: "pilot",
                    callback: setToken,
                    "expired-callback": () => setToken(""),
                    "error-callback": () => setToken(""),
                });
            }
        };
        let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
        }
        if (window.turnstile) mount();
        else script.addEventListener("load", mount);
        return () => script?.removeEventListener("load", mount);
    }, []);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setStatus("sending");
        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: f.get("name"),
                    role: f.get("role"),
                    institution: f.get("institution"),
                    institutionType: f.get("institutionType"), // school | coaching | college | other
                    city: f.get("city"),
                    email: f.get("email"),
                    phone: f.get("phone") || undefined,
                    exam: f.get("exam"),
                    sheets: f.get("sheets"),
                    message: f.get("message") || undefined,
                    turnstileToken: token,
                    website: f.get("website") ?? "", // honeypot input, visually hidden
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setStatus("done");
            } else {
                setStatus("error");
                setMessage(data.error ?? "Something went wrong.");
            }
        } catch {
            setStatus("error");
            setMessage("Could not reach the server. Please try again.");
        }
        // A Turnstile token works once. Get a fresh one before any retry.
        setToken("");
        window.turnstile?.reset(widgetId.current);
    }

    return (
        <form onSubmit={onSubmit}>
            {/* ...inputs named name, role, institution, institutionType, city, email, phone, exam, sheets, message... */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
            <div ref={box} />
            <button disabled={!token || status === "sending"}>Request a pilot</button>
        </form>
    );
}
```

Reading `res.json()` works cross-origin because the Worker sends `Access-Control-Allow-Origin` for allowed origins. Error text is safe to show to the visitor; on 422 `data.fields` maps field names to messages.

## Behaviour worth knowing

- **CORS** is an allow-list from `ALLOWED_ORIGINS` (the origin is echoed, never `*`). A browser request from any other origin is refused with 403 before anything else happens. Requests with no `Origin` header (curl) are allowed; Turnstile is the control for those.
- **Rate limit** is per IP, 5 requests per 60 seconds. If the `PILOT_LIMITER` binding exists it is used; Cloudflare documents it as per location and eventually consistent ("not an accurate accounting system"), which is enough to stop a form being hammered. Without the binding a per-isolate in-memory counter is used (see the comment in `src/ratelimit.ts`); it is best effort only. Neither replaces Turnstile.
- **Acknowledgement emails go to whatever address is typed in the form.** Turnstile and the rate limit limit abuse, but someone can still ask for an acknowledgement to a third party. Resend's free tier allows 100 emails per day, and each request sends two, so about 50 requests per day. Past that, Resend answers 429 and the Worker returns 502/503 for the request.
- **Failures are fail-closed.** If siteverify cannot be reached the request is refused (502); it is never accepted unverified.
- **Secrets** are only read from `env`, are never logged and never appear in a response. Logs (`wrangler tail`) are structured JSON and contain no names or email addresses.
- **Email addresses** must be plain ASCII (`name@domain.tld`); internationalised addresses are rejected by the shape check.

## Pricing and limits checked

Checked on 2026-10-12 against the live docs.

| Item | Fact | Source |
| --- | --- | --- |
| Workers Free requests | 100,000 requests per day (resets 00:00 UTC), 10 ms CPU per request, 50 subrequests per request, 100 Workers per account | <https://developers.cloudflare.com/workers/platform/limits/>, <https://developers.cloudflare.com/workers/platform/pricing/> |
| Workers Paid | $5/month minimum, 10 million requests/month included | <https://developers.cloudflare.com/workers/platform/pricing/> |
| Turnstile | Free plan: unlimited challenges and verifications, up to 20 widgets per account, 10 hostnames per widget, 7 days of analytics. Siteverify tokens are valid 300 s, single use, max 2048 chars | <https://developers.cloudflare.com/turnstile/plans/>, <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/> |
| Workers Rate Limiting binding | `ratelimits` config needs Wrangler 4.36+, `period` must be 10 or 60 seconds, per-location and eventually consistent. The docs page does not state plan availability; GA is announced as "stable and recommended for all production workloads" and secondary sources say it is usable on Free (not confirmed in the docs). | <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>, <https://developers.cloudflare.com/changelog/post/2025-09-19-ratelimit-workers-ga/> |
| Resend Free | 3,000 emails per month, 100 per day; Pro is $20/month for 50,000 emails. API default limit 10 requests per second per team. Sending needs a verified domain; test sending only reaches your own address | <https://resend.com/pricing>, <https://resend.com/docs/api-reference/rate-limit>, <https://resend.com/docs/api-reference/errors> |
| Resend send API | `POST https://api.resend.com/emails`, `Authorization: Bearer`, body `from`, `to`, `subject`, `text`, `reply_to` (snake_case), `Idempotency-Key` header | <https://resend.com/docs/api-reference/emails/send-email> |
| Turnstile test keys | Site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` always pass | <https://developers.cloudflare.com/turnstile/troubleshooting/testing/> |

Prices and limits change; re-check the linked pages before relying on them.

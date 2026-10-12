/**
 * Bindings and variables of the Worker. Secrets are set with `wrangler secret put`
 * (or `.dev.vars` locally); the rest are `vars` in wrangler.jsonc.
 */
export interface Env {
    // Secrets
    TURNSTILE_SECRET_KEY: string;
    RESEND_API_KEY: string;

    // Vars
    /** "Name <address@your-domain>" or a bare address. Must be on a domain verified in Resend. */
    FROM_EMAIL: string;
    /** Where pilot requests are delivered. */
    TO_EMAIL: string;
    /** Comma-separated browser origins allowed to call the Worker. */
    ALLOWED_ORIGINS: string;
    /** Optional. Comma-separated hostnames Turnstile must report (defence in depth). Unset: not checked. */
    TURNSTILE_HOSTNAMES?: string;
    /** Optional. "true" skips the Resend calls and logs instead (local testing only). */
    EMAIL_DRY_RUN?: string;

    // Bindings
    /** Workers Rate Limiting binding. Optional so the Worker still runs if the binding is removed. */
    PILOT_LIMITER?: RateLimit;
}

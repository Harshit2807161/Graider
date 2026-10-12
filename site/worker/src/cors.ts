/** Parse ALLOWED_ORIGINS into normalised origins (no trailing slash, lower case). */
export function parseAllowedOrigins(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, "").toLowerCase())
        .filter((o) => o.length > 0);
}

export function isAllowedOrigin(origin: string, allowed: string[]): boolean {
    return allowed.includes(origin.trim().replace(/\/+$/, "").toLowerCase());
}

/** CORS headers for an allowed origin. Never `*`: the origin is echoed back. */
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
    const headers: Record<string, string> = { Vary: "Origin" };
    if (origin && isAllowedOrigin(origin, allowed)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
        headers["Access-Control-Max-Age"] = "86400";
    }
    return headers;
}

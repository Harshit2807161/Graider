/** Sub-path the site is hosted under, e.g. "/graider". Empty when served from the domain root.
 *  Set with the NEXT_PUBLIC_BASE_PATH env var at build time. */
export const BASE_PATH: string = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/** Prefix a root-relative path with the base path. Use it for every asset URL that Next does not
 *  rewrite itself (plain <img src>, CSS url(), downloads). `next/link` and `metadata` add the
 *  base path on their own, so do not wrap those. */
export function withBase(path: string): string {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;  // absolute URL or fragment
    return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

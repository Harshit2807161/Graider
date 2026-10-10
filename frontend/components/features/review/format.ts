/** Numbers as the review screens show them. */

/** A score without trailing zeros ("1.5", "2"), or a dash when there is none. */
export function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

/** A 0–1 share (agreement, confidence) as a whole percentage: 0.84 → "84%". */
export function percent(value: number | null | undefined): string {
    return value == null ? "–" : `${Math.round(value * 100)}%`;
}

/** "1 answer", "2 answers". */
export function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

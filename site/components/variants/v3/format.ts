/** A mark as an examiner writes it: halves as "½" ("1½", "½"), other values without trailing zeros. */
export function markText(value: number | null | undefined): string {
    if (value == null) return "–";
    const whole = Math.floor(value);
    const rest = Math.round((value - whole) * 100) / 100;
    if (rest === 0.5) return whole === 0 ? "½" : `${whole}½`;
    return Number(value.toFixed(2)).toString();
}

/** "1 out of 1", for screen readers. */
export function markSpoken(score: number | null | undefined, outOf: number | null | undefined): string {
    const n = (v: number | null | undefined) => (v == null ? "no mark" : Number(v.toFixed(2)).toString());
    return `${n(score)} out of ${n(outOf)}`;
}

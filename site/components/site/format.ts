import { fmt } from "@product/components/features/review/format";
import site from "@/content/site";

/** "1/1", "0.5/0.5": a mark as the product writes it. */
export function markText(score: number | null | undefined, max: number | null | undefined): string {
    return `${fmt(score)}/${fmt(max)}`;
}

/** "1 out of 1", for screen readers (wording from content/site.ts). */
export function markSpoken(score: number | null | undefined, max: number | null | undefined): string {
    return site.labels.rows.outOf.replace("{score}", fmt(score)).replace("{max}", fmt(max));
}

/** Fill "{name}" slots in a label. */
export function fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

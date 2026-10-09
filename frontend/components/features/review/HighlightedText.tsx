import React from "react";
import { cn } from "@/lib/utils";
import styles from "./review.module.css";

export interface Quote {
    text: string;
    criterionId: string;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Where each quote appears in the text (case and spacing ignored), merged where they overlap. */
function findRanges(text: string, quotes: Quote[]): { start: number; end: number; ids: string[] }[] {
    const found: { start: number; end: number; ids: string[] }[] = [];
    for (const quote of quotes) {
        const words = quote.text.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0 || quote.text.trim().length < 2) continue;
        const match = new RegExp(words.map(escapeRegExp).join("\\s+"), "i").exec(text);
        if (match) found.push({ start: match.index, end: match.index + match[0].length, ids: [quote.criterionId] });
    }
    found.sort((a, b) => a.start - b.start);
    const merged: typeof found = [];
    for (const range of found) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end);
            last.ids = [...new Set([...last.ids, ...range.ids])];
        } else {
            merged.push({ ...range });
        }
    }
    return merged;
}

/** The student's text with the quoted evidence marked; the active criterion's quote stands out. */
export default function HighlightedText({ text, quotes, activeCriterion }: {
    text: string;
    quotes: Quote[];
    activeCriterion?: string | null;
}) {
    const ranges = findRanges(text, quotes);
    const pieces: React.ReactNode[] = [];
    let at = 0;
    ranges.forEach((range, i) => {
        if (range.start > at) pieces.push(text.slice(at, range.start));
        pieces.push(
            <mark key={i} className={cn(styles.evidence, activeCriterion && range.ids.includes(activeCriterion) && styles.evidenceActive)}
                  title={`Evidence for ${range.ids.join(", ")}`}>
                {text.slice(range.start, range.end)}
            </mark>,
        );
        at = range.end;
    });
    if (at < text.length) pieces.push(text.slice(at));
    return <>{pieces}</>;
}

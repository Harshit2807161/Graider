"use client";

import { useState } from "react";
import QuestionCard from "@product/components/features/review/QuestionCard";
import type { QuestionReview } from "@product/types/review.types";
import StaticPageViewer, { type StaticPage } from "@/components/sample/StaticPageViewer";
import { withBase } from "@/lib/base";
import { sampleQuestion, sampleReview } from "@/lib/sample";
import { cn } from "@product/lib/utils";
import styles from "./SampleAnswer.module.css";

const noop = () => {};

/** The product's own card for one answer, read-only: no scoring, no transcript edits, no footer. */
export function ReadOnlyCard({ q, currentPage, onShowPage = noop }: {
    q: QuestionReview;
    currentPage?: number;
    onShowPage?: (page: number) => void;
}) {
    return (
        <QuestionCard q={q} canScore={false} canEditTranscript={false} busy={false} currentPage={currentPage}
                      onResolve={noop} onOverride={noop} onEditTranscript={noop} onShowPage={onShowPage} />
    );
}

/** The card by its label, for server pages (they can't pass handlers). */
export function SampleCard({ label }: { label: string }) {
    const q = sampleQuestion(label);
    return q ? <ReadOnlyCard q={q} /> : null;
}

/** One answer as on the review screen: the page viewer beside the product's QuestionCard.
 *  The card's page buttons turn the viewer's pages. */
export default function SampleAnswer({ label, pages, captions, compact = false }: {
    label: string;
    pages: number[];
    captions?: Record<number, string>;
    /** A shorter second example: a narrower viewer column */
    compact?: boolean;
}) {
    const q = sampleQuestion(label);
    const [page, setPage] = useState(pages[0]);
    if (!q) return null;

    const meta = new Map(sampleReview.pages.map((p) => [p.number, p]));
    const viewerPages: StaticPage[] = pages.map((n) => ({
        number: n,
        src: withBase(`/sample/pages/p${String(n).padStart(2, "0")}.webp`),
        // The page record holds the original render's size; only the ratio matters here
        width: meta.get(n)?.width ?? undefined,
        height: meta.get(n)?.height ?? undefined,
    }));

    return (
        <div className={cn(styles.answer, compact && styles.compact)}>
            <div className={styles.viewer}>
                <StaticPageViewer pages={viewerPages} page={page} onPageChange={setPage} captions={captions} />
            </div>
            <div className={styles.card}>
                <ReadOnlyCard q={q} currentPage={page} onShowPage={setPage} />
            </div>
        </div>
    );
}

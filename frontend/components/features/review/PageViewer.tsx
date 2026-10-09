"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, FileText, RefreshCw, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import { PageInfo } from "@/types/review.types";
import styles from "./PageViewer.module.css";

/** The answer sheet as the model saw it, one page at a time. Images are fetched with the
 *  teacher's token and kept as object URLs until the viewer goes away. `captions` says what is on
 *  each page (e.g. "Q1, Q2"); `flagged` pages get a dot. Arrow keys move between pages. */
export default function PageViewer({ submissionId, pages, page, onPageChange, captions, flagged = [] }: {
    submissionId: string;
    pages: PageInfo[];
    page: number;
    onPageChange: (page: number) => void;
    captions?: Record<number, string>;
    /** Pages with writing the model couldn't place: marked so the teacher looks there */
    flagged?: number[];
}) {
    const urls = useRef(new Map<number, string>());  // requested pages ("" while loading)
    const mounted = useRef(true);
    const [images, setImages] = useState<Record<number, { url?: string; error?: string }>>({});
    const [attempt, setAttempt] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const pagerRef = useRef<HTMLDivElement>(null);
    const current = pages.find((p) => p.number === page);
    const index = pages.findIndex((p) => p.number === page);
    const url = images[page]?.url ?? null;
    const error = images[page]?.error ?? null;

    useEffect(() => {
        mounted.current = true;
        const cache = urls.current;
        return () => {
            mounted.current = false;
            cache.forEach((u) => u && URL.revokeObjectURL(u));
        };
    }, []);

    useEffect(() => {
        if (!current?.has_image || urls.current.has(page)) return;
        urls.current.set(page, "");
        reviewService.getPageImage(submissionId, page)
            .then((objectUrl) => {
                if (!mounted.current) return URL.revokeObjectURL(objectUrl);
                urls.current.set(page, objectUrl);
                setImages((prev) => ({ ...prev, [page]: { url: objectUrl } }));
            })
            .catch((err) => {
                urls.current.delete(page);  // try again next time the page is shown
                setImages((prev) => ({ ...prev, [page]: { error: getErrorMessage(err, "The page couldn't be loaded") } }));
            });
    }, [submissionId, page, current?.has_image, attempt]);

    const retry = () => {
        setImages((prev) => {
            const next = { ...prev };
            delete next[page];
            return next;
        });
        setAttempt((n) => n + 1);
    };

    const step = (delta: number, moveFocus = false) => {
        const target = pages[index + delta];
        if (!target) return;
        onPageChange(target.number);
        // Arrow keys: focus follows the page, as in a tab list
        if (moveFocus) pagerRef.current?.querySelector<HTMLButtonElement>(`[data-page="${target.number}"]`)?.focus();
    };

    if (pages.length === 0) {
        return (
            <section className={styles.empty} aria-labelledby="viewer-empty-title">
                <span className={styles.emptyIcon} aria-hidden="true"><ScanLine size={28} /></span>
                <h2 id="viewer-empty-title" className={styles.emptyTitle}>No pages yet</h2>
                <p className={styles.emptyText}>This answer sheet hasn&apos;t been read yet. Its pages appear here once grading starts.</p>
            </section>
        );
    }

    const aspect = current?.width && current?.height ? `${current.width} / ${current.height}` : undefined;
    const caption = captions?.[page];

    return (
        <section className={styles.viewer} aria-labelledby="viewer-title">
            <h2 id="viewer-title" className="sr-only">Answer sheet</h2>
            <div className={styles.bar}>
                <div ref={pagerRef} className={styles.pager} role="group" aria-label="Pages"
                     onKeyDown={(e) => {
                         if (e.key === "ArrowLeft") { e.preventDefault(); step(-1, true); }
                         if (e.key === "ArrowRight") { e.preventDefault(); step(1, true); }
                     }}>
                    {pages.length > 1 && (
                        <button type="button" className={styles.stepButton} onClick={() => step(-1)} disabled={index <= 0}
                                aria-label="Previous page" title="Previous page">
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                    )}
                    {pages.map((p) => (
                        <button key={p.number} type="button" aria-pressed={p.number === page} data-page={p.number}
                                className={cn(styles.pageTab, p.number === page && styles.pageTabActive)}
                                title={captions?.[p.number] ? `Page ${p.number}: ${captions[p.number]}` : `Page ${p.number}`}
                                onClick={() => onPageChange(p.number)}>
                            <span className="sr-only">
                                Page {p.number}{flagged.includes(p.number) && ", has writing the model couldn't place"}
                            </span>
                            <span aria-hidden="true">{p.number}</span>
                            {flagged.includes(p.number) && <span className={styles.flag} aria-hidden="true" />}
                        </button>
                    ))}
                    {pages.length > 1 && (
                        <button type="button" className={styles.stepButton} onClick={() => step(1)} disabled={index >= pages.length - 1}
                                aria-label="Next page" title="Next page">
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className={styles.tools}>
                    <button type="button" className={cn(styles.toolButton, zoomed && styles.toolButtonOn)} onClick={() => setZoomed(!zoomed)}
                            aria-label={zoomed ? "Fit page to width" : "Zoom in"} title={zoomed ? "Fit to width" : "Zoom in"}>
                        {zoomed ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
                    </button>
                    {url && (
                        <a className={styles.toolButton} href={url} target="_blank" rel="noreferrer"
                           aria-label="Open the page in a new tab" title="Open in a new tab">
                            <ExternalLink size={18} aria-hidden="true" />
                        </a>
                    )}
                </div>
            </div>
            <p className={styles.caption} aria-live="polite">
                <strong>Page {page} of {pages.length}</strong>
                {caption && <> · {caption}</>}
            </p>
            <div className={cn(styles.frame, zoomed && styles.zoomed)}>
                {error ? (
                    <div role="alert" className={cn(styles.message, styles.messageError)}>
                        <span className={styles.messageIcon} aria-hidden="true"><AlertCircle size={22} /></span>
                        <p>{error}</p>
                        <Button size="sm" variant="secondary" onClick={retry} icon={<RefreshCw size={14} aria-hidden="true" />}>
                            Try again
                        </Button>
                    </div>
                ) : !current?.has_image ? (
                    <div className={styles.message}>
                        <span className={styles.messageIcon} aria-hidden="true"><FileText size={22} /></span>
                        <p>This page is typed text; its words are in the transcript.</p>
                    </div>
                ) : (
                    <div className={styles.sheet} style={{ aspectRatio: aspect }}>
                        {url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
                            <img src={url} alt={`Page ${page} of ${pages.length} of the answer sheet`} className={styles.image} />
                        ) : (
                            <div className={styles.placeholder} role="img" aria-label={`Loading page ${page}`} />
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

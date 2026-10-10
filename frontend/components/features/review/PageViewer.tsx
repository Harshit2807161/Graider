"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, FileText, RefreshCw, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import { PageInfo } from "@/types/review.types";
import { plainError } from "./failure";
import styles from "./PageViewer.module.css";

/** The answer sheet as the AI read it, one page at a time. Images are fetched with the
 *  teacher's token and kept as object URLs until the viewer goes away. `captions` says what is on
 *  each page (e.g. "Q1, Q2"); `flagged` pages get a dot. Arrow keys move between pages, Home and
 *  End jump to the first and last; a zoomed page scrolls with the arrow keys once focused. */
export default function PageViewer({ submissionId, pages, page, onPageChange, captions, flagged = [] }: {
    submissionId: string;
    pages: PageInfo[];
    page: number;
    onPageChange: (page: number) => void;
    captions?: Record<number, string>;
    /** Pages with writing not matched to a question: marked so the teacher looks there */
    flagged?: number[];
}) {
    const urls = useRef(new Map<number, string>());  // requested pages ("" while loading)
    const mounted = useRef(true);
    const [images, setImages] = useState<Record<number, { url?: string; error?: string }>>({});
    const [attempt, setAttempt] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const pagerRef = useRef<HTMLDivElement>(null);
    // Dragging a zoomed page with the mouse moves it, as in a document viewer
    const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
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
                // A teacher sees the server's own words only when they mean something ("Page not found")
                const detail = plainError(getErrorMessage(err, "")) ?? "Check your connection and try again.";
                setImages((prev) => ({ ...prev, [page]: { error: detail } }));
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
        const target = pages[Math.max(0, Math.min(pages.length - 1, index + delta))];
        if (!target || target.number === page) return;
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
    const canZoom = !!current?.has_image && !error;

    return (
        <section className={styles.viewer} aria-labelledby="viewer-title">
            <h2 id="viewer-title" className="sr-only">Answer sheet</h2>
            {(pages.length > 1 || canZoom || url) && (
                <div className={styles.bar}>
                    {pages.length > 1 && (
                        <div ref={pagerRef} className={styles.pager} role="group" aria-label="Pages"
                             onKeyDown={(e) => {
                                 const delta = { ArrowLeft: -1, ArrowRight: 1, Home: -pages.length, End: pages.length }[e.key];
                                 if (delta == null) return;
                                 e.preventDefault();
                                 step(delta, true);
                             }}>
                            <button type="button" className={styles.stepButton} onClick={() => step(-1)} disabled={index <= 0}
                                    aria-label="Previous page" title="Previous page">
                                <ChevronLeft size={18} aria-hidden="true" />
                            </button>
                            {pages.map((p) => (
                                <button key={p.number} type="button" aria-pressed={p.number === page} data-page={p.number}
                                        className={cn(styles.pageTab, p.number === page && styles.pageTabActive)}
                                        title={captions?.[p.number] ? `Page ${p.number}: ${captions[p.number]}` : `Page ${p.number}`}
                                        onClick={() => onPageChange(p.number)}>
                                    <span className="sr-only">
                                        Page {p.number}{flagged.includes(p.number) && ", has writing not matched to a question"}
                                    </span>
                                    <span aria-hidden="true">{p.number}</span>
                                    {flagged.includes(p.number) && <span className={styles.flag} aria-hidden="true" />}
                                </button>
                            ))}
                            <button type="button" className={styles.stepButton} onClick={() => step(1)} disabled={index >= pages.length - 1}
                                    aria-label="Next page" title="Next page">
                                <ChevronRight size={18} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                    <div className={styles.tools}>
                        {canZoom && (
                            <button type="button" className={cn(styles.toolButton, zoomed && styles.toolButtonOn)} onClick={() => setZoomed(!zoomed)}
                                    aria-label={zoomed ? "Fit page to width" : "Zoom in"} title={zoomed ? "Fit to width" : "Zoom in"}>
                                {zoomed ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
                            </button>
                        )}
                        {url && (
                            <a className={styles.toolButton} href={url} target="_blank" rel="noreferrer"
                               aria-label="Open the page in a new tab" title="Open in a new tab">
                                <ExternalLink size={18} aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </div>
            )}
            <p className={styles.caption} aria-live="polite">
                <strong>Page {page} of {pages.length}</strong>
                {caption && <> · {caption}</>}
            </p>
            {/* Zoomed, the page is a scroll area: focusable, so the arrow keys can move around it */}
            <div className={cn(styles.frame, zoomed && url && styles.zoomed)}
                 {...(zoomed && url ? { tabIndex: 0, role: "region", "aria-label": `Page ${page}, zoomed in: scroll to see all of it` } : {})}
                 onPointerDown={(e) => {
                     if (!zoomed || e.pointerType !== "mouse" || e.button !== 0) return;
                     const frame = e.currentTarget;
                     drag.current = { x: e.clientX, y: e.clientY, left: frame.scrollLeft, top: frame.scrollTop };
                     frame.setPointerCapture(e.pointerId);
                 }}
                 onPointerMove={(e) => {
                     const from = drag.current;
                     if (!from) return;
                     e.currentTarget.scrollLeft = from.left - (e.clientX - from.x);
                     e.currentTarget.scrollTop = from.top - (e.clientY - from.y);
                 }}
                 onPointerUp={() => { drag.current = null; }}
                 onPointerCancel={() => { drag.current = null; }}>
                {error ? (
                    <div role="alert" className={cn(styles.message, styles.messageError)}>
                        <span className={styles.messageIcon} aria-hidden="true"><AlertCircle size={24} /></span>
                        <div>
                            <p className={styles.messageTitle}>Page {page} couldn&apos;t be loaded</p>
                            <p>{error}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={retry} icon={<RefreshCw size={16} aria-hidden="true" />}>
                            Try again
                        </Button>
                    </div>
                ) : !current?.has_image ? (
                    <div className={styles.message}>
                        <span className={styles.messageIcon} aria-hidden="true"><FileText size={24} /></span>
                        <p>This page is typed text, so there is no image to show.</p>
                    </div>
                ) : (
                    <div className={styles.sheet} style={{ aspectRatio: aspect }}>
                        {url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
                            <img src={url} alt={`Page ${page} of ${pages.length} of the answer sheet`} className={styles.image} draggable={false} />
                        ) : (
                            <div className={styles.placeholder} role="img" aria-label={`Loading page ${page}`} />
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

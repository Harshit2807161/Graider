"use client";

import React, { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@product/lib/utils";
import styles from "./StaticPageViewer.module.css";

export interface StaticPage {
    number: number;
    /** Image URL, already prefixed with the base path (use `withBase`) */
    src: string;
    width?: number;
    height?: number;
    /** Alt text for this page's image */
    alt?: string;
}

/** A static copy of the product's PageViewer (frontend/components/features/review/PageViewer.tsx):
 *  same markup and classes, but the images are plain URLs, so it needs no API. `captions` says what
 *  is on each page (e.g. "Q1, Q2"); `flagged` pages get a dot. Arrow keys move between pages, Home
 *  and End jump to the first and last; a zoomed page scrolls with the arrow keys once focused. */
export default function StaticPageViewer({ pages, page, onPageChange, captions, flagged = [], total }: {
    pages: StaticPage[];
    page: number;
    onPageChange: (page: number) => void;
    captions?: Record<number, string>;
    /** Pages with writing not matched to a question: marked so the reader looks there */
    flagged?: number[];
    /** Total pages in the answer book, when only some are shown */
    total?: number;
}) {
    const titleId = useId();
    const [zoomed, setZoomed] = useState(false);
    const pagerRef = useRef<HTMLDivElement>(null);
    // Dragging a zoomed page with the mouse moves it, as in a document viewer
    const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
    const current = pages.find((p) => p.number === page);
    const index = pages.findIndex((p) => p.number === page);
    const url = current?.src ?? null;

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
    const canZoom = !!url;

    return (
        <section className={styles.viewer} aria-labelledby={titleId}>
            <h2 id={titleId} className="sr-only">Answer sheet</h2>
            {(pages.length > 1 || canZoom) && (
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
                <strong>Page {page} of {total ?? pages.length}</strong>
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
                {!current ? (
                    <div className={styles.message}>
                        <p>This page is not available.</p>
                    </div>
                ) : (
                    <div className={styles.sheet} style={{ aspectRatio: aspect }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                        <img src={current.src} alt={current.alt ?? `Page ${page} of ${total ?? pages.length} of the answer sheet`} className={styles.image} draggable={false} />
                    </div>
                )}
            </div>
        </section>
    );
}

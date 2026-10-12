"use client";

import React, { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@product/lib/utils";
import styles from "@/components/sample/StaticPageViewer.module.css";

export interface ViewerPage {
    number: number;
    /** Image URL, already prefixed with the base path (use `withBase`) */
    src: string;
    width: number;
    height: number;
    alt: string;
}

/** `components/sample/StaticPageViewer` with three fixes this variant needs (same markup, same CSS
 *  module): the caption counts against the answer book's `total` pages, not the pages passed in
 *  ("Page 23 of 31", not "of 2"); each page has its own `alt`; the heading id is unique, so two
 *  viewers can share a page. The fixes belong upstream in StaticPageViewer. */
export default function PageViewer({ pages, page, onPageChange, total, captions, eager = false }: {
    pages: ViewerPage[];
    page: number;
    onPageChange: (page: number) => void;
    /** Pages in the whole answer book */
    total: number;
    captions?: Record<number, string>;
    /** The first screen's image: load it first */
    eager?: boolean;
}) {
    const [zoomed, setZoomed] = useState(false);
    const pagerRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
    const current = pages.find((p) => p.number === page) ?? pages[0];
    const index = pages.indexOf(current);

    const step = (delta: number, moveFocus = false) => {
        const target = pages[Math.max(0, Math.min(pages.length - 1, index + delta))];
        if (!target || target.number === page) return;
        onPageChange(target.number);
        if (moveFocus) pagerRef.current?.querySelector<HTMLButtonElement>(`[data-page="${target.number}"]`)?.focus();
    };

    const caption = captions?.[current.number];

    return (
        <section className={styles.viewer} aria-labelledby={titleId}>
            <h3 id={titleId} className="sr-only">Answer book pages</h3>
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
                            <button key={p.number} type="button" aria-pressed={p.number === current.number} data-page={p.number}
                                    className={cn(styles.pageTab, p.number === current.number && styles.pageTabActive)}
                                    title={captions?.[p.number] ? `Page ${p.number}: ${captions[p.number]}` : `Page ${p.number}`}
                                    onClick={() => onPageChange(p.number)}>
                                <span className="sr-only">Page </span>{p.number}
                            </button>
                        ))}
                        <button type="button" className={styles.stepButton} onClick={() => step(1)} disabled={index >= pages.length - 1}
                                aria-label="Next page" title="Next page">
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div className={styles.tools}>
                    <button type="button" className={cn(styles.toolButton, zoomed && styles.toolButtonOn)} onClick={() => setZoomed(!zoomed)}
                            aria-label={zoomed ? "Fit page to width" : "Zoom in"} title={zoomed ? "Fit to width" : "Zoom in"}>
                        {zoomed ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
                    </button>
                    <a className={styles.toolButton} href={current.src} target="_blank" rel="noreferrer"
                       aria-label="Open the page in a new tab" title="Open in a new tab">
                        <ExternalLink size={18} aria-hidden="true" />
                    </a>
                </div>
            </div>
            <p className={styles.caption} aria-live="polite">
                <strong>Page {current.number} of {total}</strong>
                {caption && <> · {caption}</>}
            </p>
            <div className={cn(styles.frame, zoomed && styles.zoomed)}
                 {...(zoomed ? { tabIndex: 0, role: "region", "aria-label": `Page ${current.number}, zoomed in: scroll to see all of it` } : {})}
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
                <div className={styles.sheet} style={{ aspectRatio: `${current.width} / ${current.height}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img src={current.src} alt={current.alt} width={current.width} height={current.height}
                         className={styles.image} draggable={false}
                         fetchPriority={eager ? "high" : "auto"} decoding="async" />
                </div>
            </div>
        </section>
    );
}

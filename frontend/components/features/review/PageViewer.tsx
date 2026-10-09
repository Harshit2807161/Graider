"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import { PageInfo } from "@/types/review.types";
import styles from "./review.module.css";

/** The answer sheet as the model saw it, one page at a time. Images are fetched with the
 *  teacher's token and kept as object URLs until the viewer goes away. */
export default function PageViewer({ submissionId, pages, page, onPageChange }: {
    submissionId: string;
    pages: PageInfo[];
    page: number;
    onPageChange: (page: number) => void;
}) {
    const urls = useRef(new Map<number, string>());  // requested pages ("" while loading)
    const mounted = useRef(true);
    const [images, setImages] = useState<Record<number, { url?: string; error?: string }>>({});
    const [zoomed, setZoomed] = useState(false);
    const current = pages.find((p) => p.number === page);
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
    }, [submissionId, page, current?.has_image]);

    if (pages.length === 0) {
        return <div className={styles.viewerEmpty}>No pages: this answer sheet hasn&apos;t been read yet.</div>;
    }

    return (
        <section className={styles.viewer} aria-label="Answer sheet">
            <div className={styles.viewerBar}>
                <div className={styles.pageTabs} role="group" aria-label="Pages">
                    {pages.map((p) => (
                        <button key={p.number} type="button" aria-pressed={p.number === page}
                                className={cn(styles.pageTab, p.number === page && styles.pageTabActive)}
                                onClick={() => onPageChange(p.number)}>
                            <span className="sr-only">Page </span>{p.number}
                        </button>
                    ))}
                </div>
                <div className={styles.viewerTools}>
                    <button type="button" className={styles.iconButton} onClick={() => setZoomed(!zoomed)}
                            aria-label={zoomed ? "Fit page to width" : "Zoom in"} title={zoomed ? "Fit to width" : "Zoom in"}>
                        {zoomed ? <ZoomOut size={16} aria-hidden="true" /> : <ZoomIn size={16} aria-hidden="true" />}
                    </button>
                    {url && (
                        <a className={styles.iconButton} href={url} target="_blank" rel="noreferrer"
                           aria-label="Open the page in a new tab" title="Open in a new tab">
                            <ExternalLink size={16} aria-hidden="true" />
                        </a>
                    )}
                </div>
            </div>
            <div className={cn(styles.pageFrame, zoomed && styles.pageFrameZoomed)}>
                {error ? (
                    <p role="alert" className={styles.viewerEmpty}>{error}</p>
                ) : !current?.has_image ? (
                    <p className={styles.viewerEmpty}>This page is typed text; its words are in the transcript.</p>
                ) : url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
                    <img src={url} alt={`Page ${page} of ${pages.length} of the answer sheet`} className={styles.pageImage} />
                ) : (
                    <p className={styles.viewerEmpty} aria-live="polite">Loading page {page}…</p>
                )}
            </div>
        </section>
    );
}

"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode, type RefObject } from "react";
import { markSpoken } from "@/components/site/format";
import { fmtMark } from "./sheets";
import styles from "./Ink.module.css";

/** True once the element has scrolled into view (and stays true). */
export function useSeen<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px 0px -12% 0px"): boolean {
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || seen) return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
        }, { rootMargin });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin, seen]);
    return seen;
}

export function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts a mark up in half-mark steps (0, 0.5, 1 ...) once `go` turns true; the final value is
 *  rendered on the server, so without JS or with reduced motion nothing moves. */
export function useCount(value: number | null, go: boolean, duration = 420, delay = 0): { shown: number | null; armed: boolean } {
    const [shown, setShown] = useState<number | null>(value);
    const [isArmed, setArmed] = useState(false);
    const [started, setStarted] = useState(false);
    const armed = useRef(false);

    // Hide the number until it can count (below the fold only: the first screen is never blanked)
    useEffect(() => {
        if (value == null || prefersReducedMotion()) return;
        armed.current = true;
        setArmed(true);
        setShown(0);
    }, [value]);

    useEffect(() => {
        if (!go || !armed.current || value == null) return;
        const steps = Math.round(value * 2);
        const each = Math.max(60, duration / Math.max(steps, 1));
        let i = 0;
        // Write the 0, then add half marks: 0, 0.5, 1 ...
        let timer = window.setTimeout(() => {
            setStarted(true);
            if (steps === 0) return;
            timer = window.setTimeout(function tick() {
                i += 1;
                setShown(i / 2);
                if (i < steps) timer = window.setTimeout(tick, each);
            }, each);
        }, delay);
        return () => window.clearTimeout(timer);
    }, [go, value, duration, delay]);

    // Hidden while armed and waiting: a mark is never shown as a zero it hasn't counted from
    return { shown, armed: isArmed && !started };
}

type InkSize = "s" | "m" | "l" | "xl";

/** The examiner's mark in red: a tick that draws itself, the score large and "/max" small. With
 *  `when` it starts when that turns true; otherwise when the mark scrolls into view. */
export function InkMark({ score, max, size = "m", when, delay = 0, tick = true, className, as = "span" }: {
    score: number | null; max: number | null; size?: InkSize; when?: boolean; delay?: number;
    tick?: boolean; className?: string; as?: ElementType;
}) {
    const ref = useRef<HTMLElement>(null);
    const seen = useSeen(ref);
    const go = when ?? seen;
    const { shown, armed } = useCount(score, go, 420, delay);
    const Tag = as;
    const nil = score === 0;
    return (
        <Tag ref={ref} className={[styles.mark, styles[size], className].filter(Boolean).join(" ")}
             data-go={go ? "" : undefined} data-armed={armed ? "" : undefined} style={{ "--ink-delay": `${delay}ms` } as React.CSSProperties}>
            {tick && (
                <svg className={styles.tick} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {nil
                        ? <path d="M5 5 L19 19 M19 5 L5 19" pathLength={1} />
                        : <path d="M3 13.5 L9 19.5 L21.5 4.5" pathLength={1} />}
                </svg>
            )}
            <span className={styles.num} aria-hidden="true">
                {fmtMark(shown)}<span className={styles.max}>/{fmtMark(max)}</span>
            </span>
            <span className="sr-only">{markSpoken(score, max)}</span>
        </Tag>
    );
}

/** A block that gets `data-seen` once it scrolls into view: CSS draws its highlights then. */
export function Reveal({ as = "div", className, children, ...rest }: {
    as?: ElementType; className?: string; children: ReactNode;
} & Record<string, unknown>) {
    const ref = useRef<HTMLElement>(null);
    const seen = useSeen(ref);
    const Tag = as;
    return <Tag ref={ref} className={className} data-seen={seen ? "" : undefined} {...rest}>{children}</Tag>;
}

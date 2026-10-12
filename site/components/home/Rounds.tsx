"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeContent } from "@/content/types";
import { fill } from "@/components/site/format";
import { prefersReducedMotion } from "./Ink";
import { fmtMark, type RoundRecord } from "./sheets";
import styles from "./Rounds.module.css";

/** Steps a number to a new value in half-mark steps (3 → 3.5 → 4), about 280 ms in all. */
function useStepped(value: number): number {
    const [shown, setShown] = useState(value);
    const from = useRef(value);
    useEffect(() => {
        const start = from.current;
        from.current = value;
        if (start === value) return;
        if (prefersReducedMotion()) { setShown(value); return; }
        const dir = value > start ? 0.5 : -0.5;
        const steps = Math.round(Math.abs(value - start) * 2);
        const each = Math.max(70, 280 / steps);
        let i = 0;
        let timer = window.setTimeout(function step() {
            i += 1;
            setShown(start + dir * i);
            if (i < steps) timer = window.setTimeout(step, each);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [value]);
    return shown;
}

function Total({ label, value, max, ink }: { label: string; value: number; max: number; ink: "red" | "dark" }) {
    const shown = useStepped(value);
    return (
        <div className={styles.total}>
            <span className={styles.who}>{label}</span>
            <span className={`${styles.big} ${ink === "red" ? styles.red : ""}`}>
                {/* The changing figure re-keys so each half mark is written afresh */}
                <span key={shown} className={styles.figure}>{fmtMark(shown)}</span>
                <span className={styles.max}>/{fmtMark(max)}</span>
            </span>
        </div>
    );
}

/** The second examiner's three rounds on 35(a), stepped through by the reader: both totals, and the
 *  one point they argued over. Figures from the grade record's rounds. */
export default function Rounds({ labels, rounds, max }: {
    labels: HomeContent["wrong"]["rounds"]; rounds: RoundRecord[]; max: number;
}) {
    const [step, setStep] = useState(0);
    const r = rounds[step];
    const last = step === rounds.length - 1;
    const agreed = r.graderTotal === r.examinerTotal;

    return (
        <div className={styles.rounds}>
            <h3 className={styles.heading}>{labels.heading}</h3>
            <div className={styles.controls}>
                <div className={styles.steps} role="group" aria-label={labels.heading}>
                    {rounds.map((x, i) => (
                        <button key={x.round} type="button" className={styles.step} aria-pressed={step === i}
                                onClick={() => setStep(i)}>
                            {fill(labels.round, { n: x.round })}
                        </button>
                    ))}
                </div>
                <button type="button" className={styles.next} onClick={() => setStep((s) => (s + 1) % rounds.length)}>
                    {last ? fill(labels.round, { n: 1 }) : labels.next}
                </button>
            </div>

            <div className={styles.board} aria-live="polite">
                <Total label={labels.grader} value={r.graderTotal} max={max} ink="dark" />
                <span className={styles.state} data-agreed={agreed ? "" : undefined}>
                    {agreed ? labels.agreed : labels.apart}
                </span>
                <Total label={labels.examiner} value={r.examinerTotal} max={max} ink="red" />
            </div>

            {r.point && (
                <p className={styles.point}>
                    <span>{labels.point}</span>
                    <span className={styles.pair}>
                        <span>{labels.grader} <strong>{fmtMark(r.point.grader)}</strong></span>
                        <span>{labels.examiner} <strong className={styles.red}>{fmtMark(r.point.examiner)}</strong></span>
                    </span>
                </p>
            )}
        </div>
    );
}

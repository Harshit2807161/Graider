"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Bot, FileText, Gavel, History, Play, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import { TimelineEntry, escalationText } from "@/types/review.types";
import { explainFailure } from "./failure";
import styles from "./dialogs.module.css";

const EVENT_TEXT: Record<string, string> = {
    override: "Scores changed",
    resolve: "Proposed score accepted",
    transcript_edit: "Transcript corrected",
    regrade_requested: "Regrade requested",
    approve: "Approved",
    unapprove: "Approval withdrawn",
    publish: "Published",
    review_complete: "Review complete",
};

const RUN_TEXT: Record<string, string> = {
    upload: "Grading after upload",
    regrade: "Regrade",
    transcript_edit: "Regrade after a transcript correction",
};

const RUN_STATUS: Record<string, string> = {
    queued: "queued",
    running: "in progress",
    succeeded: "finished",
    failed: "failed",
};

function fmt(value: unknown): string {
    return typeof value === "number" ? Number(value.toFixed(2)).toString() : "–";
}

function describe(entry: TimelineEntry): { icon: React.ReactNode; title: string; detail?: string; technical?: string; tone?: string } {
    const d = entry.data as Record<string, never>;
    const label = entry.question_label ? `${entry.question_label} · ` : "";
    switch (entry.type) {
        case "run": {
            const failed = d.status === "failed";
            const usage = `${d.llm_calls} model ${d.llm_calls === 1 ? "call" : "calls"} · $${Number(d.cost_usd ?? 0).toFixed(2)}`;
            return {
                icon: failed ? <AlertCircle size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />,
                title: `${RUN_TEXT[d.trigger] ?? "Grading run"} ${RUN_STATUS[d.status] ?? d.status}`,
                detail: failed ? explainFailure(d.error).cause : usage,
                technical: failed ? [d.error, usage].filter(Boolean).join(" · ") : undefined,
                tone: failed ? "runFailed" : undefined,
            };
        }
        case "llm_call":
            return {
                icon: <Bot size={14} aria-hidden="true" />,
                title: `${label}${String(d.purpose).replace(/_/g, " ")} · ${d.model_answered ?? d.model_requested}`,
                detail: [d.attempt_kind !== "initial" && d.attempt_kind, d.fallback_reason, d.error_type,
                         `${d.latency_ms} ms`, d.cost_usd != null && `$${fmt(d.cost_usd)}`].filter(Boolean).join(" · "),
            };
        case "transcription":
            return {
                icon: <FileText size={14} aria-hidden="true" />,
                title: `${label}Transcript v${d.version} (${d.source === "teacher" ? "teacher" : "model"})`,
            };
        case "grade":
            return {
                icon: <Gavel size={14} aria-hidden="true" />,
                title: `${label}Grade v${d.version} (${d.source === "teacher" ? "teacher" : "model"}): ${fmt(d.score)} / ${fmt(d.max_score)}`,
                detail: d.status === "escalated" ? `Needs review: ${escalationText(d.escalation_reason)}` : (d.override_reason ?? undefined),
                tone: d.status === "escalated" ? "gradeReview" : undefined,
            };
        default:
            return {
                icon: <UserRound size={14} aria-hidden="true" />,
                title: `${label}${EVENT_TEXT[d.kind] ?? d.kind}`,
                detail: d.reason ?? undefined,
            };
    }
}

function day(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Everything that happened to the submission, oldest first, by day. Model calls are hidden by default. */
export default function TimelineDialog({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
    const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [showCalls, setShowCalls] = useState(false);

    useEffect(() => {
        let cancelled = false;
        reviewService.getTimeline(submissionId)
            .then((data) => !cancelled && setEntries(data))
            .catch((err) => !cancelled && setError(getErrorMessage(err, "The history couldn't be loaded")));
        return () => {
            cancelled = true;
        };
    }, [submissionId, attempt]);

    const callCount = (entries ?? []).filter((e) => e.type === "llm_call").length;
    const shown = (entries ?? []).filter((e) => showCalls || e.type !== "llm_call");
    const days: { day: string; items: TimelineEntry[] }[] = [];
    shown.forEach((entry) => {
        const d = day(entry.at);
        if (days.length === 0 || days[days.length - 1].day !== d) days.push({ day: d, items: [] });
        days[days.length - 1].items.push(entry);
    });

    return (
        <Modal open title="History" onClose={onClose} size="lg" icon={<History size={18} aria-hidden="true" />}
               description="Grading runs, transcript and grade versions, and every teacher action.">
            <div className={styles.toolbar}>
                <label className={styles.toggle}>
                    <input type="checkbox" checked={showCalls} onChange={(e) => setShowCalls(e.target.checked)} />
                    Show model calls ({callCount})
                </label>
                {entries && <span className={styles.count} aria-live="polite">{shown.length} {shown.length === 1 ? "entry" : "entries"}</span>}
            </div>
            {error && (
                <div role="alert" className={styles.formError}>
                    <AlertCircle size={16} aria-hidden="true" />
                    <span className={styles.grow}>{error}</span>
                    <Button size="sm" variant="secondary" onClick={() => {
                        setError(null);
                        setAttempt((n) => n + 1);
                    }}>Try again</Button>
                </div>
            )}
            {!entries && !error && (
                <div aria-busy="true">
                    <p className="sr-only" role="status">Loading the history…</p>
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={styles.skeletonRow}>
                            <span className={styles.skeleton} style={{ width: "2rem", height: "2rem", borderRadius: "50%" }} />
                            <span className={styles.skeleton} style={{ width: `${70 - i * 10}%`, height: "0.875rem" }} />
                        </div>
                    ))}
                </div>
            )}
            {entries && shown.length === 0 && <p className={styles.emptyHistory}>Nothing has happened to this answer sheet yet.</p>}
            {days.map((group) => (
                <section key={group.day} aria-label={group.day}>
                    <h3 className={styles.day}>{group.day}</h3>
                    <ol className={styles.timeline}>
                        {group.items.map((entry, i) => {
                            const { icon, title, detail, technical, tone } = describe(entry);
                            return (
                                <li key={`${entry.type}-${entry.at}-${i}`} className={cn(styles.entry, styles[`tl_${tone ?? entry.type}`])}>
                                    <span className={styles.entryIcon}>{icon}</span>
                                    <div>
                                        <p className={styles.entryTitle}>{title}</p>
                                        {detail && <p className={styles.entryDetail}>{detail}</p>}
                                        {technical && <p className={styles.entryTech}>{technical}</p>}
                                    </div>
                                    <time className={styles.entryTime} dateTime={entry.at}>
                                        {new Date(entry.at).toLocaleTimeString(undefined, { timeStyle: "short" })}
                                    </time>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </Modal>
    );
}

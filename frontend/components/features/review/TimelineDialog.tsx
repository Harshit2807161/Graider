"use client";

import React, { useEffect, useState } from "react";
import { Bot, FileText, Gavel, Play, UserRound } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { reviewService } from "@/services/review.service";
import { TimelineEntry, escalationText } from "@/types/review.types";
import styles from "./review.module.css";

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

function fmt(value: unknown): string {
    return typeof value === "number" ? Number(value.toFixed(2)).toString() : "–";
}

function describe(entry: TimelineEntry): { icon: React.ReactNode; title: string; detail?: string } {
    const d = entry.data as Record<string, never>;
    const label = entry.question_label ? `${entry.question_label} · ` : "";
    switch (entry.type) {
        case "run":
            return {
                icon: <Play size={14} aria-hidden="true" />,
                title: `Grading run (${String(d.trigger).replace("_", " ")}): ${d.status}`,
                detail: [`${d.llm_calls} model calls`, `$${fmt(d.cost_usd)}`, d.error].filter(Boolean).join(" · "),
            };
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
            };
        default:
            return {
                icon: <UserRound size={14} aria-hidden="true" />,
                title: `${label}${EVENT_TEXT[d.kind] ?? d.kind}`,
                detail: d.reason ?? undefined,
            };
    }
}

/** Everything that happened to the submission, oldest first. Model calls are hidden by default. */
export default function TimelineDialog({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
    const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showCalls, setShowCalls] = useState(false);

    useEffect(() => {
        reviewService.getTimeline(submissionId)
            .then(setEntries)
            .catch((err) => setError(getErrorMessage(err, "The history couldn't be loaded")));
    }, [submissionId]);

    const shown = (entries ?? []).filter((e) => showCalls || e.type !== "llm_call");
    return (
        <Modal open title="History" onClose={onClose} size="lg"
               description="Grading runs, transcript and grade versions, and every teacher action.">
            <label className={styles.checkbox}>
                <input type="checkbox" checked={showCalls} onChange={(e) => setShowCalls(e.target.checked)} />
                Show model calls ({(entries ?? []).filter((e) => e.type === "llm_call").length})
            </label>
            {error && <p role="alert" className={styles.formError}>{error}</p>}
            {!entries && !error && <p className={styles.muted} aria-live="polite">Loading…</p>}
            <ol className={styles.timeline}>
                {shown.map((entry, i) => {
                    const { icon, title, detail } = describe(entry);
                    return (
                        <li key={i} className={styles[`tl_${entry.type}`]}>
                            <span className={styles.timelineIcon}>{icon}</span>
                            <div>
                                <p className={styles.timelineTitle}>{title}</p>
                                {detail && <p className={styles.sectionNote}>{detail}</p>}
                            </div>
                            <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
                        </li>
                    );
                })}
            </ol>
        </Modal>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/api";
import { reviewService } from "@/services/review.service";
import { GradingSettings } from "@/types/review.types";
import styles from "./GradingSettingsPanel.module.css";

/** An exam's grading settings; new grading runs use them. */
export default function GradingSettingsPanel({ examId }: { examId: string }) {
    const [saved, setSaved] = useState<GradingSettings | null>(null);
    const [draft, setDraft] = useState<{ threshold: string; spotPercent: string; policy: "best" | "first" } | null>(null);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        reviewService.getGradingSettings(examId)
            .then((s) => {
                setSaved(s);
                setDraft({ threshold: String(s.agreement_threshold), spotPercent: String(Math.round(s.spot_check_rate * 100)), policy: s.choice_policy });
            })
            .catch((err) => setMessage({ kind: "error", text: getErrorMessage(err, "Settings couldn't be loaded") }));
    }, [examId]);

    if (!draft || !saved) {
        return message ? <p role="alert" className={styles.formError}>{message.text}</p> : <p className={styles.muted}>Loading…</p>;
    }

    const threshold = Number(draft.threshold);
    const spot = Number(draft.spotPercent);
    const valid = draft.threshold !== "" && draft.spotPercent !== "" && threshold >= 0.5 && threshold <= 1 && spot >= 0 && spot <= 100;
    const changed = threshold !== saved.agreement_threshold || spot / 100 !== saved.spot_check_rate || draft.policy !== saved.choice_policy;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const s = await reviewService.updateGradingSettings(examId, {
                agreement_threshold: threshold, spot_check_rate: spot / 100, choice_policy: draft.policy,
            });
            setSaved(s);
            setMessage({ kind: "ok", text: "Saved. Answer sheets graded from now on use these settings." });
        } catch (err) {
            setMessage({ kind: "error", text: getErrorMessage(err, "Settings couldn't be saved") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className={styles.form}>
            <label className={styles.field}>
                <span>Agreement needed (0.5 to 1)</span>
                <input type="number" min={0.5} max={1} step={0.05} value={draft.threshold} className={styles.settingInput}
                       onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} aria-describedby="threshold-help" />
                <small id="threshold-help" className={styles.sectionNote}>
                    A grade is final when the two examiners agree at least this much; below it, they discuss, then the answer comes to you.
                </small>
            </label>
            <label className={styles.field}>
                <span>Spot checks (% of confident answers)</span>
                <input type="number" min={0} max={100} step={1} value={draft.spotPercent} className={styles.settingInput}
                       onChange={(e) => setDraft({ ...draft, spotPercent: e.target.value })} aria-describedby="spot-help" />
                <small id="spot-help" className={styles.sectionNote}>Answers sent to you for review even when the examiners agree.</small>
            </label>
            <label className={styles.field}>
                <span>When a student answers more alternatives of a choice question than allowed</span>
                <select value={draft.policy} className={styles.settingInput}
                        onChange={(e) => setDraft({ ...draft, policy: e.target.value as "best" | "first" })}>
                    <option value="best">Count the best-scoring ones</option>
                    <option value="first">Count the first ones answered</option>
                </select>
            </label>
            {message && <p role={message.kind === "error" ? "alert" : "status"}
                           className={message.kind === "error" ? styles.formError : styles.sectionNote}>{message.text}</p>}
            <div>
                <Button type="submit" disabled={!valid || !changed} isLoading={saving}>Save settings</Button>
            </div>
        </form>
    );
}

"use client";

import React, { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";
import InlineMessage from "@/components/features/exams/InlineMessage";
import { getErrorMessage } from "@/lib/api";
import { reviewService } from "@/services/review.service";
import { GradingSettings } from "@/types/review.types";
import styles from "./GradingSettingsPanel.module.css";

/** An exam's grading settings; new grading runs use them. Laid out as settings rows:
 *  what the setting means on the left, its control on the right. */
export default function GradingSettingsPanel({ examId }: { examId: string }) {
    const id = useId();
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
        return message
            ? <InlineMessage kind="error">{message.text}</InlineMessage>
            : (
                <div className={styles.loading} aria-busy="true">
                    <span className="sr-only" role="status">Loading settings…</span>
                    {[0, 1, 2].map((i) => <span key={i} className={styles.skeletonRow} />)}
                </div>
            );
    }

    const threshold = Number(draft.threshold);
    const spot = Number(draft.spotPercent);
    const thresholdOk = draft.threshold !== "" && threshold >= 0.5 && threshold <= 1;
    const spotOk = draft.spotPercent !== "" && spot >= 0 && spot <= 100;
    const valid = thresholdOk && spotOk;
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
        <form onSubmit={save} className={styles.form} noValidate>
            <div className={styles.rows}>
                <div className={styles.row}>
                    <div className={styles.labelBlock}>
                        <label htmlFor={`${id}-threshold`} className={styles.label}>Agreement needed (0.5 to 1)</label>
                        <p id={`${id}-threshold-help`} className={styles.help}>
                            A grade is final when the two examiners agree at least this much; below it, they discuss, then the answer comes to you.
                        </p>
                    </div>
                    <div className={styles.control}>
                        <input id={`${id}-threshold`} type="number" min={0.5} max={1} step={0.05} value={draft.threshold}
                               className={styles.input} aria-invalid={!thresholdOk}
                               aria-describedby={`${id}-threshold-help${thresholdOk ? "" : ` ${id}-threshold-error`}`}
                               onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} />
                        {!thresholdOk && <p id={`${id}-threshold-error`} className={styles.fieldError}>Enter a number from 0.5 to 1.</p>}
                    </div>
                </div>
                <div className={styles.row}>
                    <div className={styles.labelBlock}>
                        <label htmlFor={`${id}-spot`} className={styles.label}>Spot checks (% of confident answers)</label>
                        <p id={`${id}-spot-help`} className={styles.help}>Answers sent to you for review even when the examiners agree.</p>
                    </div>
                    <div className={styles.control}>
                        <div className={styles.suffixWrap}>
                            <input id={`${id}-spot`} type="number" min={0} max={100} step={1} value={draft.spotPercent}
                                   className={styles.input} aria-invalid={!spotOk}
                                   aria-describedby={`${id}-spot-help${spotOk ? "" : ` ${id}-spot-error`}`}
                                   onChange={(e) => setDraft({ ...draft, spotPercent: e.target.value })} />
                            <span className={styles.suffix} aria-hidden="true">%</span>
                        </div>
                        {!spotOk && <p id={`${id}-spot-error`} className={styles.fieldError}>Enter a percentage from 0 to 100.</p>}
                    </div>
                </div>
                <div className={styles.row}>
                    <div className={styles.labelBlock}>
                        <label htmlFor={`${id}-policy`} className={styles.label}>
                            When a student answers more alternatives of a choice question than allowed
                        </label>
                        <p className={styles.help}>Which of the answered alternatives count towards the total.</p>
                    </div>
                    <div className={styles.control}>
                        <div className={styles.selectWrap}>
                            <select id={`${id}-policy`} value={draft.policy} className={styles.select}
                                    onChange={(e) => setDraft({ ...draft, policy: e.target.value as "best" | "first" })}>
                                <option value="best">Count the best-scoring ones</option>
                                <option value="first">Count the first ones answered</option>
                            </select>
                            <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.actions}>
                {message && (
                    <InlineMessage kind={message.kind === "ok" ? "success" : "error"} onDismiss={() => setMessage(null)}>
                        {message.text}
                    </InlineMessage>
                )}
                {!message && changed && valid && <p className={styles.unsaved}>Unsaved changes</p>}
                <Button type="submit" disabled={!valid || !changed} isLoading={saving} variant={changed && valid ? "primary" : "secondary"}>
                    Save settings
                </Button>
            </div>
        </form>
    );
}

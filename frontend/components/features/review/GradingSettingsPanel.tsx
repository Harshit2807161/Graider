"use client";

import React, { useEffect, useId, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import InlineMessage from "@/components/ui/InlineMessage";
import { getErrorMessage } from "@/lib/api";
import { actionError } from "@/components/features/exams/actionError";
import { reviewService } from "@/services/review.service";
import { GradingSettings } from "@/types/review.types";
import styles from "./GradingSettingsPanel.module.css";

/** Fractions from the API are shown and edited as whole percentages (0.8 → 80). */
const toPercent = (fraction: number): string => String(Math.round(fraction * 100));

/** An exam's grading settings; answer sheets graded from now on use them. Laid out as settings rows:
 *  what the setting means on the left, its control on the right. */
export default function GradingSettingsPanel({ examId, onDirtyChange }: {
    examId: string;
    /** Told when the form starts or stops having unsaved changes (the page guards navigation) */
    onDirtyChange?: (dirty: boolean) => void;
}) {
    const id = useId();
    const [saved, setSaved] = useState<GradingSettings | null>(null);
    const [draft, setDraft] = useState<{ agreementPercent: string; spotPercent: string; policy: "best" | "first" } | null>(null);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
    const [saving, setSaving] = useState(false);
    // Bumped by "Try again" to load the settings once more
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        reviewService.getGradingSettings(examId)
            .then((s) => {
                setSaved(s);
                setDraft({ agreementPercent: toPercent(s.agreement_threshold), spotPercent: toPercent(s.spot_check_rate), policy: s.choice_policy });
            })
            .catch((err) => setMessage({ kind: "error", text: getErrorMessage(err, "Settings couldn't be loaded") }));
    }, [examId, attempt]);

    const agreement = Number(draft?.agreementPercent);
    const spot = Number(draft?.spotPercent);
    const changed = !!draft && !!saved && (agreement !== Number(toPercent(saved.agreement_threshold))
        || spot !== Number(toPercent(saved.spot_check_rate)) || draft.policy !== saved.choice_policy);

    useEffect(() => {
        onDirtyChange?.(changed);
    }, [changed, onDirtyChange]);

    if (!draft || !saved) {
        return message
            ? <ErrorBanner title="The grading settings couldn't be loaded" detail={message.text}
                           onRetry={() => { setMessage(null); setAttempt((n) => n + 1); }} />
            : (
                <div className={styles.loading} aria-busy="true">
                    <span className="sr-only" role="status">Loading settings…</span>
                    {[0, 1, 2].map((i) => <span key={i} className={styles.skeletonRow} />)}
                </div>
            );
    }

    const agreementOk = draft.agreementPercent !== "" && agreement >= 50 && agreement <= 100;
    const spotOk = draft.spotPercent !== "" && spot >= 0 && spot <= 100;
    const valid = agreementOk && spotOk;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const s = await reviewService.updateGradingSettings(examId, {
                agreement_threshold: agreement / 100, spot_check_rate: spot / 100, choice_policy: draft.policy,
            });
            setSaved(s);
            // What the server kept (e.g. rounded), so the form reads as saved
            setDraft({ agreementPercent: toPercent(s.agreement_threshold), spotPercent: toPercent(s.spot_check_rate), policy: s.choice_policy });
            setMessage({ kind: "ok", text: "Saved. Answer sheets graded from now on use these settings." });
        } catch (err) {
            setMessage({ kind: "error", text: actionError(err, "The settings couldn't be saved") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className={styles.form} noValidate>
            <div className={styles.rows}>
                <div className={styles.row}>
                    <div className={styles.labelBlock}>
                        <label htmlFor={`${id}-agreement`} className={styles.label}>Agreement needed (50 to 100%)</label>
                        <p id={`${id}-agreement-help`} className={styles.help}>
                            A grade is final when the two examiners agree at least this much; below it, they discuss, then the answer comes to you.
                        </p>
                    </div>
                    <div className={styles.control}>
                        <div className={styles.suffixWrap}>
                            <input id={`${id}-agreement`} type="number" inputMode="numeric" min={50} max={100} step={5} value={draft.agreementPercent}
                                   className={styles.input} aria-invalid={!agreementOk}
                                   aria-describedby={`${id}-agreement-help${agreementOk ? "" : ` ${id}-agreement-error`}`}
                                   onChange={(e) => setDraft({ ...draft, agreementPercent: e.target.value })} />
                            <span className={styles.suffix} aria-hidden="true">%</span>
                        </div>
                        {!agreementOk && <p id={`${id}-agreement-error`} className={styles.fieldError}>Enter a percentage from 50 to 100.</p>}
                    </div>
                </div>
                <div className={styles.row}>
                    <div className={styles.labelBlock}>
                        <label htmlFor={`${id}-spot`} className={styles.label}>Spot checks (% of confident answers)</label>
                        <p id={`${id}-spot-help`} className={styles.help}>Answers sent to you for review even when the examiners agree.</p>
                    </div>
                    <div className={styles.control}>
                        <div className={styles.suffixWrap}>
                            <input id={`${id}-spot`} type="number" inputMode="numeric" min={0} max={100} step={1} value={draft.spotPercent}
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
            {/* The same save bar as the questions section: state on the left, Save on the right */}
            <div className={styles.actions}>
                <p className={styles.state}>
                    {!valid ? "Correct the value above to save."
                        : changed ? <><span className={styles.dot} aria-hidden="true" /><span className={styles.unsaved}>Unsaved changes</span></>
                        : <><CheckCircle2 size={16} className={styles.savedIcon} aria-hidden="true" />Settings saved</>}
                </p>
                <div className={styles.saveGroup}>
                    {message && (
                        <InlineMessage kind={message.kind === "ok" ? "success" : "error"} onDismiss={() => setMessage(null)}>
                            {message.text}
                        </InlineMessage>
                    )}
                    <Button type="submit" disabled={!valid || !changed} isLoading={saving} variant={changed && valid ? "primary" : "secondary"}>
                        Save settings
                    </Button>
                </div>
            </div>
        </form>
    );
}

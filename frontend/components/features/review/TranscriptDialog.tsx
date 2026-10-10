"use client";

import React, { useState } from "react";
import { AlertCircle, Check, Pencil, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { QuestionReview, SubmissionReview } from "@/types/review.types";
import styles from "./dialogs.module.css";

/** Correct what was read for one answer. That question is graded again from the teacher's text.
 *  Writing not matched to a question can be added with one click. */
export default function TranscriptDialog({ q, approved, unplaced = [], onClose, onSubmit }: {
    q: QuestionReview;
    approved: boolean;
    unplaced?: SubmissionReview["unassigned_segments"];
    onClose: () => void;
    onSubmit: (text: string, reason: string) => Promise<void>;
}) {
    const [text, setText] = useState(q.transcription?.text ?? "");
    const [reason, setReason] = useState("");
    const [added, setAdded] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const ready = text.trim().length > 0 && reason.trim().length > 0 && !saving;
    const pieces = unplaced.filter((s) => s.text?.trim());
    // No answer was read: the unmatched writing is the likeliest source, so it comes first
    const unplacedFirst = !(q.transcription?.text ?? "").trim();

    const add = (i: number, piece: string) => {
        setText((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}\n${piece}` : piece));
        setAdded((prev) => new Set(prev).add(i));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        setSaving(true);
        setError(null);
        try {
            await onSubmit(text, reason.trim());
        } catch (err) {
            setError(getErrorMessage(err, "The transcript couldn't be saved"));
            setSaving(false);
        }
    };

    const unplacedSection = pieces.length > 0 && (
        <section className={styles.unplaced} aria-labelledby="unplaced-dialog-title">
            <h3 id="unplaced-dialog-title" className={styles.unplacedTitle}>Writing not matched to a question</h3>
            <p className={styles.help}>If it belongs to {q.label}, add it to the transcript.</p>
            <ul className={styles.unplacedList}>
                {pieces.map((s, i) => (
                    <li key={i} className={styles.unplacedItem}>
                        <div className={styles.unplacedText}>
                            {s.page != null && <span className={styles.unplacedPage}>Page {s.page}</span>}
                            <pre>{s.text}</pre>
                        </div>
                        <Button type="button" size="sm" variant="secondary" disabled={added.has(i)}
                                onClick={() => add(i, s.text!.trim())}
                                icon={added.has(i) ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                                aria-label={added.has(i) ? `Added${s.page != null ? ` from page ${s.page}` : ""}`
                                    : `Add to the transcript${s.page != null ? ` (page ${s.page})` : ""}`}>
                            {added.has(i) ? "Added" : "Add"}
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );

    return (
        <Modal open title={`Correct transcript · ${q.label}`} onClose={onClose} size="lg"
               icon={<Pencil size={18} aria-hidden="true" />}
               description={<>
                   {q.label} will be graded again from your text; other answers keep their grades.
                   {approved && " The submission's approval is cleared and it needs approving again."}
               </>}
               footer={
                   <>
                       <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                       <Button type="submit" form="transcript-form" disabled={!ready} isLoading={saving}>Save and regrade</Button>
                   </>
               }>
            <form id="transcript-form" onSubmit={submit} className={styles.form}>
                {unplacedFirst && unplacedSection}
                <div className={styles.field}>
                    <label htmlFor="transcript-text" className={styles.label}>What the student wrote</label>
                    <textarea id="transcript-text" rows={10} className={`${styles.textarea} ${styles.mono}`} value={text} required
                              aria-describedby="transcript-help" onChange={(e) => setText(e.target.value)} />
                    <p id="transcript-help" className={styles.help}>Type it as written, mistakes included: the grade depends on it.</p>
                </div>
                {!unplacedFirst && unplacedSection}
                <div className={styles.field}>
                    <label htmlFor="transcript-reason" className={styles.label}>
                        Reason for the correction <span className={styles.required} aria-hidden="true">*</span>
                    </label>
                    <textarea id="transcript-reason" rows={2} className={styles.textarea} value={reason} required
                              aria-describedby="transcript-reason-help" onChange={(e) => setReason(e.target.value)}
                              placeholder="e.g. The last line was misread." />
                    <p id="transcript-reason-help" className={styles.help}>Required. Kept in the audit trail.</p>
                </div>
                {error && (
                    <p role="alert" className={styles.formError}>
                        <AlertCircle size={16} aria-hidden="true" />
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}

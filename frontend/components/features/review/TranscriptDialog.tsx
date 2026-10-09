"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { QuestionReview } from "@/types/review.types";
import styles from "./review.module.css";

/** Correct what was read for one answer. That question is graded again from the teacher's text. */
export default function TranscriptDialog({ q, approved, onClose, onSubmit }: {
    q: QuestionReview;
    approved: boolean;
    onClose: () => void;
    onSubmit: (text: string, reason: string) => Promise<void>;
}) {
    const [text, setText] = useState(q.transcription?.text ?? "");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const ready = text.trim().length > 0 && reason.trim().length > 0 && !saving;

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

    return (
        <Modal open title={`Correct transcript · ${q.label}`} onClose={onClose} size="lg"
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
                <label className={styles.field}>
                    <span>What the student wrote</span>
                    <textarea rows={10} className={styles.monoInput} value={text} required
                              onChange={(e) => setText(e.target.value)} />
                </label>
                <label className={styles.field}>
                    <span>Reason for the correction <span aria-hidden="true">*</span></span>
                    <textarea rows={2} value={reason} required onChange={(e) => setReason(e.target.value)}
                              placeholder="Kept in the audit trail, e.g. “The last line was misread”." />
                </label>
                {error && <p role="alert" className={styles.formError}>{error}</p>}
            </form>
        </Modal>
    );
}

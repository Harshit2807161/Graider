"use client";

import React, { ReactNode, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import Button from "./Button";
import Modal from "./Modal";
import styles from "./Modal.module.css";

/** Ask before an action, optionally with a reason for the audit trail. */
export default function ConfirmDialog({ title, message, confirmLabel, withReason = false, danger = false, onConfirm, onClose }: {
    title: string;
    message: ReactNode;
    confirmLabel: string;
    withReason?: boolean;
    danger?: boolean;
    onConfirm: (reason: string) => Promise<void>;
    onClose: () => void;
}) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        setBusy(true);
        setError(null);
        try {
            await onConfirm(reason.trim());
        } catch (err) {
            setError(getErrorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal open title={title} onClose={onClose} footer={
            <>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant={danger ? "danger" : "primary"} onClick={confirm} isLoading={busy}>{confirmLabel}</Button>
            </>
        }>
            <div className={styles.confirmBody}>
                <div>{message}</div>
                {withReason && (
                    <label className={styles.confirmField}>
                        <span>Reason (optional)</span>
                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
                    </label>
                )}
                {error && <p role="alert" className={styles.confirmError}>{error}</p>}
            </div>
        </Modal>
    );
}

"use client";

import React, { ReactNode, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import Button from "./Button";
import Modal from "./Modal";
import styles from "./Modal.module.css";

/** Ask before an action, optionally with a reason for the audit trail. */
export default function ConfirmDialog({ title, message, confirmLabel, withReason = false, danger = false, icon, onConfirm, onClose }: {
    title: string;
    message: ReactNode;
    confirmLabel: string;
    withReason?: boolean;
    danger?: boolean;
    /** Shown in the dialog's header tile (default: a question mark, or a warning for destructive actions) */
    icon?: ReactNode;
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
        <Modal open title={title} onClose={onClose} tone={danger ? "danger" : "default"}
               icon={icon ?? (danger ? <AlertTriangle size={18} /> : <HelpCircle size={18} />)} footer={
            <>
                {/* Without a reason to type, start on the safe choice */}
                <Button variant="secondary" onClick={onClose} data-autofocus={withReason ? undefined : true}>Cancel</Button>
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

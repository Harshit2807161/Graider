import React, { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./InlineMessage.module.css";

export type MessageKind = "success" | "error" | "info";

export interface Message {
    kind: MessageKind;
    text: string;
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

/** Feedback next to the action that caused it: success and info are announced politely
 *  (role="status"), errors at once (role="alert"). Icon plus words, never colour alone. */
export default function InlineMessage({ kind, children, action, onDismiss, className }: {
    kind: MessageKind;
    children: ReactNode;
    action?: ReactNode;
    onDismiss?: () => void;
    className?: string;
}) {
    const Icon = ICONS[kind];
    return (
        <div role={kind === "error" ? "alert" : "status"} className={cn(styles.message, styles[kind], className)}>
            <Icon size={16} className={styles.icon} aria-hidden="true" />
            <div className={styles.text}>{children}</div>
            {action}
            {onDismiss && (
                <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss message">
                    <X size={14} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

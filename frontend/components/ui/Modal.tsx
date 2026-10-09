"use client";

import React, { ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Modal.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: "md" | "lg";
    /** Shown under the title */
    description?: ReactNode;
    /** A small icon in the header tile, as in the app's other dialogs */
    icon?: ReactNode;
}

/** An accessible dialog: focus moves in and stays in, Escape closes, focus returns on close. */
export default function Modal({ open, title, onClose, children, footer, size = "md", description, icon }: ModalProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        // Start in the first field if there is one, else on the first control
        const first = dialog?.querySelector<HTMLElement>("textarea, input, select")
            ?? dialog?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab" || !dialog) return;
            const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) return;
            const [head, tail] = [items[0], items[items.length - 1]];
            if (e.shiftKey && document.activeElement === head) {
                e.preventDefault();
                tail.focus();
            } else if (!e.shiftKey && document.activeElement === tail) {
                e.preventDefault();
                head.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            previous?.focus();
        };
    }, [open]);

    if (!open) return null;
    return (
        <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
                 className={cn(styles.dialog, styles[size])}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        {icon && <span className={styles.iconTile} aria-hidden="true">{icon}</span>}
                        <div>
                            <h2 id={titleId} className={styles.title}>{title}</h2>
                            {description && <div className={styles.description}>{description}</div>}
                        </div>
                    </div>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
                <div className={styles.body}>{children}</div>
                {footer && <footer className={styles.footer}>{footer}</footer>}
            </div>
        </div>
    );
}

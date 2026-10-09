import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import styles from "./ErrorBanner.module.css";

interface ErrorBannerProps {
    /** A plain sentence for the teacher, e.g. "The classes couldn't be loaded" */
    title: string;
    /** What the server said, shown smaller underneath (left out when it only repeats the title) */
    detail?: string | null;
    onRetry?: () => void;
    retryLabel?: string;
    className?: string;
}

/** Something couldn't load: a friendly sentence first, the technical detail second, and a way to retry. */
export default function ErrorBanner({ title, detail, onRetry, retryLabel = "Try again", className }: ErrorBannerProps) {
    const extra = detail?.trim() && detail.trim().replace(/\.$/, "") !== title.replace(/\.$/, "") ? detail.trim() : null;
    return (
        <div className={cn(styles.banner, className)} role="alert">
            <AlertCircle size={20} aria-hidden="true" className={styles.icon} />
            <div className={styles.body}>
                <div className={styles.text}>
                    <p className={styles.title}>{title}</p>
                    {extra && <p className={styles.detail}>{extra}</p>}
                </div>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} className={styles.retry}
                            icon={<RefreshCw size={14} aria-hidden="true" />}>
                        {retryLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}

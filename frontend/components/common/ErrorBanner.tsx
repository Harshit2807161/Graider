import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { plainError } from "@/components/features/review/failure";
import styles from "./ErrorBanner.module.css";

interface ErrorBannerProps {
    /** A plain sentence for the teacher, e.g. "The classes couldn't be loaded" */
    title: string;
    /** What the server said, shown smaller underneath (left out when it only repeats the title; technical
     *  noise such as "Internal server error" becomes a plain sentence) */
    detail?: string | null;
    onRetry?: () => void;
    retryLabel?: string;
    className?: string;
}

/** What to say under the title: the server's message when it means something to a teacher ("Exam not
 *  found"), a plain sentence instead of technical noise ("Internal server error", "status code 502"),
 *  nothing when it only repeats the title. */
function explain(title: string, detail?: string | null): string | null {
    const text = detail?.trim();
    if (!text || text.replace(/\.$/, "") === title.replace(/\.$/, "")) return null;
    if (/network error/i.test(text)) return "Check your internet connection, then try again.";
    return plainError(text) ?? "Something went wrong on our side. Try again in a moment.";
}

/** Something couldn't load: a friendly sentence first, what it means second, and a way to retry. */
export default function ErrorBanner({ title, detail, onRetry, retryLabel = "Try again", className }: ErrorBannerProps) {
    const extra = explain(title, detail);
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
                            icon={<RefreshCw size={16} aria-hidden="true" />}>
                        {retryLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}

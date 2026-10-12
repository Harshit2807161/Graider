import { cn } from "@product/lib/utils";
import styles from "./Slip.module.css";

/** The "sent to you" slip: an escalation as a note clipped to the page, its reason in the
 *  product's own words. `compact` sizes the type with the scan it sits on. */
export default function Slip({ label, reason, detail, compact = false, className }: {
    label: string;
    reason: string;
    detail?: string;
    compact?: boolean;
    className?: string;
}) {
    return (
        <div className={cn(styles.slip, compact && styles.compact, className)} role="note">
            <svg className={styles.clip} viewBox="0 0 12 28" aria-hidden="true" focusable="false">
                <path d="M3 9v12a3 3 0 0 0 6 0V4.5a2.5 2.5 0 0 0-5 0V20a1 1 0 0 0 2 0V9" />
            </svg>
            <p className={styles.label}>{label}</p>
            <p className={styles.reason}>{reason}</p>
            {detail && <p className={styles.detail}>{detail}</p>}
        </div>
    );
}

import type { SlipContent } from "@/content/types";
import styles from "./Slip.module.css";

/** The "sent to you" slip: an escalation as a note clipped to the page, its reason in the product's
 *  own words. Always shown as an illustration, with the caption saying so. */
export default function Slip({ slip }: { slip: SlipContent }) {
    return (
        <figure className={styles.figure}>
            <div className={styles.stage}>
                <div className={styles.slip}>
                    <svg className={styles.clip} viewBox="0 0 12 28" aria-hidden="true" focusable="false">
                        <path d="M3 9v12a3 3 0 0 0 6 0V4.5a2.5 2.5 0 0 0-5 0V20a1 1 0 0 0 2 0V9" />
                    </svg>
                    <p className={styles.label}>{slip.label}</p>
                    <p className={styles.reason}>{slip.reason}</p>
                    <p className={styles.detail}>{slip.detail}</p>
                </div>
            </div>
            <figcaption className={styles.caption}>{slip.caption}</figcaption>
        </figure>
    );
}

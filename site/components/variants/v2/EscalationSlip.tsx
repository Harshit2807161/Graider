import { AlertTriangle } from "lucide-react";
import StatusBadge from "@product/components/ui/StatusBadge";
import { escalationText } from "@product/types/review.types";
import copy from "./copy";
import styles from "./EscalationSlip.module.css";

/** An illustration, labelled as one: the product's "needs review" callout for an answer whose two
 *  examiners still disagree, in the product's own words (ESCALATION_TEXT and the card's hint). No
 *  answer, score or position is invented; the run had no such escalation. */
export default function EscalationSlip() {
    const t = copy.more.sent;
    return (
        <figure className={styles.figure}>
            <div className={styles.slip}>
                <div className={styles.head}>
                    <p className={styles.title}>{t.illustrationTitle}</p>
                    <span className={styles.tag}>{t.illustration}</span>
                    <StatusBadge status="escalated" />
                </div>
                <div className={styles.callout} role="note">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div>
                        <p className={styles.calloutTitle}>{escalationText("evaluator_disagreement")}</p>
                        <p className={styles.calloutText}>{t.hint}</p>
                    </div>
                </div>
            </div>
            <figcaption className={styles.caption}>{t.illustrationCaption}</figcaption>
        </figure>
    );
}

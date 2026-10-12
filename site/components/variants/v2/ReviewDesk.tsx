"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, MessagesSquare } from "lucide-react";
import ExaminerRounds from "@product/components/features/review/ExaminerRounds";
import QuestionCard from "@product/components/features/review/QuestionCard";
import cardStyles from "@product/components/features/review/QuestionCard.module.css";
import { percent, plural } from "@product/components/features/review/format";
import type { QuestionReview } from "@product/types/review.types";
import { cn } from "@product/lib/utils";
import PageViewer, { type ViewerPage } from "./PageViewer";
import styles from "./ReviewDesk.module.css";

const noop = () => {};

/** The product's review desk for one answer: the answer book page beside the product's QuestionCard,
 *  read-only. "Page N" in the card switches the viewer, as in the app.
 *  `roundsBelow` moves the card's examiner discussion out of the narrow card column to the full width
 *  under the desk, open, in the card's own disclosure chrome (the same ExaminerRounds component), so
 *  the rounds read as a table instead of a long column. `animateEvidence` plays the page's one load
 *  animation on the transcript's highlights. */
export default function ReviewDesk({ question, pages, total, captions, pageNotes, roundsBelow = false, animateEvidence = false, eager = false }: {
    question: QuestionReview;
    pages: ViewerPage[];
    total: number;
    captions?: Record<number, string>;
    /** Notes about the pages, under the viewer (they stay in view with it on wide screens) */
    pageNotes?: React.ReactNode;
    roundsBelow?: boolean;
    animateEvidence?: boolean;
    eager?: boolean;
}) {
    const [page, setPage] = useState(pages[0].number);
    const grade = question.grade;
    const rounds = grade?.rounds ?? [];
    const last = rounds[rounds.length - 1];
    const showRounds = roundsBelow && rounds.length > 0;
    const discussionRef = useRef<HTMLDetailsElement>(null);

    // Open in the static HTML; on a phone the three rounds are a long read, so they start closed there
    useEffect(() => {
        if (discussionRef.current && window.matchMedia("(max-width: 47.99rem)").matches) discussionRef.current.open = false;
    }, []);

    return (
        <div className={styles.wrap}>
            <div className={styles.desk}>
                <div className={styles.viewerColumn}>
                    <div className={styles.viewerSlot}>
                        <PageViewer pages={pages} page={page} onPageChange={setPage} total={total} captions={captions} eager={eager} />
                    </div>
                    {pageNotes && <div className={styles.notes}>{pageNotes}</div>}
                </div>
                <div className={cn(styles.answers, animateEvidence && styles.sweep, showRounds && styles.roundsMoved)}>
                    <QuestionCard q={question} canScore={false} canEditTranscript={false} busy={false} currentPage={page}
                                  onResolve={noop} onOverride={noop} onEditTranscript={noop}
                                  onShowPage={(p) => { if (pages.some((x) => x.number === p)) setPage(p); }} />
                </div>
            </div>
            {showRounds && (
                <div className={styles.rounds}>
                    <details ref={discussionRef} className={cn(cardStyles.disclosure, styles.discussion)} open>
                        <summary>
                            <MessagesSquare size={16} aria-hidden="true" className={cardStyles.summaryIcon} />
                            <span className={cardStyles.summaryText}>
                                Examiner discussion, {question.label}{" "}
                                <span className={cardStyles.summaryMeta}>
                                    · {plural(rounds.length, "round", "rounds")}
                                    {last && ` · agreement ${percent(last.effective_agreement)}`}
                                </span>
                            </span>
                            <ChevronRight size={16} aria-hidden="true" className={cardStyles.chevron} />
                        </summary>
                        <div className={cardStyles.disclosureBody}>
                            <ExaminerRounds rounds={rounds} criteria={question.rubric_spec?.spec.criteria ?? []} />
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

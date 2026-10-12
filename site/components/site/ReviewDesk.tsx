"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessagesSquare } from "lucide-react";
import ExaminerRounds from "@product/components/features/review/ExaminerRounds";
import QuestionCard from "@product/components/features/review/QuestionCard";
import cardStyles from "@product/components/features/review/QuestionCard.module.css";
import { percent } from "@product/components/features/review/format";
import { cn } from "@product/lib/utils";
import StaticPageViewer, { type StaticPage } from "@/components/sample/StaticPageViewer";
import { PAGE_ALT, PAGE_IMAGE, pageSrc } from "@/content/sample-marks";
import site from "@/content/site";
import type { Para } from "@/content/types";
import { withBase } from "@/lib/base";
import { sampleQuestion, sampleReview } from "@/lib/sample";
import styles from "./ReviewDesk.module.css";

const noop = () => {};

function viewerPage(number: number): StaticPage {
    return { number, src: withBase(pageSrc(number)), width: PAGE_IMAGE.width, height: PAGE_IMAGE.height, alt: PAGE_ALT[number] };
}

/** The product's review desk for one answer, read-only: the answer book page beside the product's
 *  QuestionCard. "Page N" in the card turns the viewer, as in the app. `roundsBelow` moves the card's
 *  examiner discussion out of the narrow card column to the full width under the desk, open, in the
 *  card's own disclosure chrome (the same ExaminerRounds component). */
export default function ReviewDesk({ answer, pages, pageCaptions, notes = [], roundsBelow = false }: {
    /** The question's label in the sample data */
    answer: string;
    pages: number[];
    pageCaptions?: Record<number, string>;
    /** Under the page viewer (they stay in view with it on wide screens) */
    notes?: Para[];
    roundsBelow?: boolean;
}) {
    const question = sampleQuestion(answer);
    if (!question) throw new Error(`Sample question ${answer} is missing from content/sample-data/review.json`);
    const labels = site.labels.desk;
    const viewerPages = pages.map(viewerPage);
    const [page, setPage] = useState(pages[0]);
    const rounds = question.grade?.rounds ?? [];
    const last = rounds[rounds.length - 1];
    const showRounds = roundsBelow && rounds.length > 0;
    const discussionRef = useRef<HTMLDetailsElement>(null);

    // Open in the static HTML; on a phone the rounds are a long read, so they start closed there
    useEffect(() => {
        if (discussionRef.current && window.matchMedia("(max-width: 47.99rem)").matches) discussionRef.current.open = false;
    }, []);

    return (
        <div className={styles.wrap}>
            <div className={styles.desk}>
                <div className={styles.viewerColumn}>
                    <div className={styles.viewerSlot}>
                        <StaticPageViewer pages={viewerPages} page={page} onPageChange={setPage}
                                          total={sampleReview.pages.length} captions={pageCaptions} />
                    </div>
                    {notes.length > 0 && (
                        <div className={styles.notes}>
                            {notes.map((n, i) => <p key={i}>{n.lead && <strong>{n.lead}</strong>} {n.body}</p>)}
                        </div>
                    )}
                </div>
                <div className={cn(styles.answers, showRounds && styles.roundsMoved)}>
                    <QuestionCard q={question} canScore={false} canEditTranscript={false} busy={false} currentPage={page}
                                  onResolve={noop} onOverride={noop} onEditTranscript={noop}
                                  onShowPage={(p) => { if (pages.includes(p)) setPage(p); }} />
                </div>
            </div>
            {showRounds && (
                <div className={styles.rounds}>
                    <details ref={discussionRef} className={cn(cardStyles.disclosure, styles.discussion)} open>
                        <summary>
                            <MessagesSquare size={16} aria-hidden="true" className={cardStyles.summaryIcon} />
                            <span className={cardStyles.summaryText}>
                                {labels.discussion}, {question.label}{" "}
                                <span className={cardStyles.summaryMeta}>
                                    · {rounds.length} {rounds.length === 1 ? labels.rounds[0] : labels.rounds[1]}
                                    {last && ` · ${labels.agreement} ${percent(last.effective_agreement)}`}
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

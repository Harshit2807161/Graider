import type { Metadata } from "next";
import ExaminerRounds from "@product/components/features/review/ExaminerRounds";
import type { QuestionReview } from "@product/types/review.types";
import BookHeader from "@/components/variants/v3/BookHeader";
import ExaminerGrid from "@/components/variants/v3/ExaminerGrid";
import QuestionRows from "@/components/variants/v3/QuestionRows";
import copy from "@/components/variants/v3/copy";
import styles from "@/components/variants/v3/book.module.css";
import { sampleQuestion, sampleQuestions } from "@/lib/sample";

// Design variant, not linked from the nav.
export const metadata: Metadata = {
    title: "Variant v3: the answer book",
    description: copy.hero.lede,
    robots: { index: false },
};

function need(label: string): QuestionReview {
    const q = sampleQuestion(label);
    if (!q) throw new Error(`Sample question ${label} is missing from content/sample-data/review.json`);
    return q;
}

export default function Page() {
    const q35 = need("35(a)");
    const q21 = need("21");
    const q24 = need("24(a)");
    const { hero, sample, rounds, grid } = copy;
    const runLine = hero.runLine.replace("{sentToTeacher}", copy.run.sentToTeacher);

    return (
        <div className={styles.book}>
            <BookHeader />

            <section className={`${styles.row} ${styles.end} ${styles.hero}`} aria-labelledby="v3-h1">
                <div className={styles.margin}>
                    <span className={styles.marginHead} aria-hidden="true">{hero.marginHead}</span>
                </div>
                <div className={styles.writing}>
                    <h1 id="v3-h1" className={styles.h1}>
                        <span>{hero.h1[0]}</span> <span>{hero.h1[1]}</span>
                    </h1>
                    <p className={styles.lede}>{hero.lede}</p>
                    <div className={styles.actions}>
                        <a href={copy.pilot.href} className={styles.button}>{copy.pilot.label}</a>
                        <a href={hero.secondary.href} className={styles.textLink}>{hero.secondary.label}</a>
                    </div>
                    <p className={styles.runLine}>{runLine}</p>
                </div>
            </section>

            <section id={sample.id} aria-labelledby="v3-sample" className={styles.end}>
                <QuestionRows q={q35} animate explain={{ c5: sample.c5Note }} heading={
                    <>
                        <h2 id="v3-sample" className={styles.h2}>{sample.heading}</h2>
                        <p className={styles.intro}>{sample.intro}</p>
                    </>
                } />
            </section>

            <section aria-label={`Question ${q21.label}`} className={styles.end}>
                <QuestionRows q={q21} />
            </section>

            <section aria-labelledby="v3-rounds" className={`${styles.row} ${styles.end} ${styles.sectionHead}`}>
                <div className={styles.margin}>
                    <span className={`${styles.qno} ${styles.qnoMuted}`}><span className="sr-only">Question </span>{q35.label}</span>
                </div>
                <div className={styles.writing}>
                    <h2 id="v3-rounds" className={styles.h2}>{rounds.heading}</h2>
                    <p className={styles.intro}>{rounds.intro}</p>
                    <div className={styles.product}>
                        <ExaminerRounds rounds={q35.grade?.rounds ?? []} criteria={q35.rubric_spec?.spec.criteria ?? []} />
                    </div>
                </div>
            </section>

            <section aria-labelledby="v3-grid" className={`${styles.row} ${styles.end} ${styles.sectionHead}`}>
                <div className={styles.margin} />
                <div className={styles.writing}>
                    <h2 id="v3-grid" className={styles.h2}>{grid.heading}</h2>
                    <ExaminerGrid questions={[q35, q21, q24]} all={sampleQuestions} />
                </div>
            </section>

            <div className={`${styles.row} ${styles.end} ${styles.closingRow}`}>
                <div className={styles.margin} />
                <div className={`${styles.writing} ${styles.closing}`}>
                    <p>{copy.closing}</p>
                    <a href={copy.pilot.href} className={styles.button}>{copy.pilot.label}</a>
                </div>
            </div>
        </div>
    );
}

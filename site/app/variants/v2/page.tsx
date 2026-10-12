import type { Metadata } from "next";
import Link from "next/link";
import AnswerCard from "@/components/variants/v2/AnswerCard";
import copy, { RUN_ANSWERS_SENT_TO_TEACHER } from "@/components/variants/v2/copy";
import EscalationSlip from "@/components/variants/v2/EscalationSlip";
import type { ViewerPage } from "@/components/variants/v2/PageViewer";
import ReviewDesk from "@/components/variants/v2/ReviewDesk";
import SiteHeader from "@/components/variants/v2/SiteHeader";
import { withBase } from "@/lib/base";
import { sampleQuestion, sampleReview } from "@/lib/sample";
import styles from "./page.module.css";

// Design variant v2, "The review screen". Not linked from the nav.
export const metadata: Metadata = {
    title: "Variant v2: the review screen",
    description: copy.lede,
    robots: { index: false },
};

function viewerPage(number: number): ViewerPage {
    const meta = sampleReview.pages.find((p) => p.number === number);
    // The published images are 1348 px wide; keep the scan's own proportions from the review data
    const width = 1348;
    const height = meta?.width && meta.height ? Math.round((width * meta.height) / meta.width) : 954;
    return { number, src: withBase(`/sample/pages/p${String(number).padStart(2, "0")}.webp`), width, height, alt: copy.alt[number] ?? `Page ${number} of the answer book` };
}

function question(label: string) {
    const q = sampleQuestion(label);
    if (!q) throw new Error(`Sample question ${label} is missing from content/sample-data/review.json`);
    return q;
}

export default function Page() {
    const total = sampleReview.pages.length;
    const q35 = question("35(a)");
    const q21 = question("21");
    const q24a = question("24(a)");
    const c = copy.caption;

    return (
        <div className={styles.root}>
            <SiteHeader />

            <section className={styles.hero} aria-labelledby="v2-title">
                <div className={styles.container}>
                    <h1 id="v2-title" className={styles.h1}>
                        {copy.h1[0]} <span className={styles.h1Line}>{copy.h1[1]}</span>
                    </h1>
                    <div className={styles.leadRow}>
                        <p className={styles.lede}>{copy.lede}</p>
                        <div className={styles.ctas}>
                            <Link href={copy.pilot.href} className={styles.primary}>{copy.pilot.label}</Link>
                            <a href={copy.secondary.href} className={styles.secondary}>{copy.secondary.label}</a>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.band} aria-labelledby="v2-panel">
                <div className={styles.wide}>
                    <figure className={styles.figure}>
                        <h2 id="v2-panel" className="sr-only">{copy.panelTitle}</h2>
                        <ReviewDesk question={q35} pages={[viewerPage(23), viewerPage(24)]} total={total}
                                    captions={{ 23: "35(a)", 24: "35(a), 36(b)" }} roundsBelow animateEvidence eager
                                    pageNotes={<>
                                        <p><strong>{c.page.lead}</strong> {c.page.text}</p>
                                        <p><strong>{c.grade.lead}</strong> {c.grade.text}</p>
                                        <p><strong>{c.miss.lead}</strong> {c.miss.text}</p>
                                    </>} />
                        <figcaption className={styles.caption}>{copy.figcaption}</figcaption>
                    </figure>
                </div>
                <div className={styles.container}>
                    <p className={styles.run}>{copy.run(RUN_ANSWERS_SENT_TO_TEACHER)}</p>
                </div>
            </section>

            <section id="more-answers" className={styles.more} aria-labelledby="v2-more">
                <div className={styles.container}>
                    <header className={styles.sectionHead}>
                        <h2 id="v2-more" className={styles.h2}>{copy.more.h2}</h2>
                        <p className={styles.intro}>{copy.more.intro}</p>
                    </header>

                    <article className={styles.example} aria-labelledby="v2-q21">
                        <div className={styles.exampleText}>
                            <h3 id="v2-q21" className={styles.h3}>{copy.more.short.h3}</h3>
                            <p>{copy.more.short.text}</p>
                        </div>
                        <ReviewDesk question={q21} pages={[viewerPage(4)]} total={total} captions={{ 4: "21, 22" }} />
                    </article>

                    <article className={styles.example} aria-labelledby="v2-sent">
                        <div className={styles.exampleText}>
                            <h3 id="v2-sent" className={styles.h3}>{copy.more.sent.h3}</h3>
                            <p>{copy.more.sent.text}</p>
                        </div>
                        <div className={styles.pair}>
                            <figure className={styles.pairItem}>
                                <AnswerCard question={q24a} />
                                <figcaption className={styles.pairCaption}>{copy.more.sent.notAttempted}</figcaption>
                            </figure>
                            <EscalationSlip />
                        </div>
                    </article>
                </div>
            </section>

            <section className={styles.close} aria-labelledby="v2-close">
                <div className={styles.container}>
                    <h2 id="v2-close" className={styles.h2}>{copy.close.h2}</h2>
                    <p className={styles.closeText}>{copy.close.text}</p>
                    <Link href={copy.pilot.href} className={styles.primary}>{copy.pilot.label}</Link>
                </div>
            </section>
        </div>
    );
}

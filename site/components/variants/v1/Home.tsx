import { v1 } from "./copy";
import ExaminedPage from "./ExaminedPage";
import SampleAnswer, { SampleCard } from "./SampleAnswer";
import Slip from "./Slip";
import V1Header from "./V1Header";
import styles from "./Home.module.css";

/** Home, variant v1 "The examined page": the real scan with Gr8r's marks on it is the hero; the
 *  product's own review card shows the same answer in full below. */
export default function Home() {
    const { hero, sample, escalation, close } = v1;
    return (
        <div className={styles.page}>
            <V1Header />

            <section className={styles.hero} aria-labelledby="v1-title">
                <div className={styles.heroText}>
                    <h1 id="v1-title" className={styles.title}>
                        {hero.title.map((line) => <span key={line} className={styles.titleLine}>{line}</span>)}
                    </h1>
                    <p className={styles.lede}>{hero.lede}</p>
                    <div className={styles.actions}>
                        <a href={v1.pilot.href} className={styles.primary}>{v1.pilot.label}</a>
                        <a href={hero.secondary.href} className={styles.secondary}>{hero.secondary.label}</a>
                    </div>
                </div>
                <div className={styles.heroScan}>
                    <ExaminedPage />
                </div>
                <p className={styles.run}>{hero.run}</p>
            </section>

            <section id="sample" className={styles.sample} aria-labelledby="v1-sample">
                <div className={styles.inner}>
                    <div className={styles.sectionHead}>
                        <h2 id="v1-sample" className={styles.h2}>{sample.heading}</h2>
                        <p className={styles.intro}>{sample.intro}</p>
                    </div>
                    <SampleAnswer label="35(a)" pages={[23, 24]} captions={sample.viewerCaptions} />
                    <p className={styles.check}>{sample.check}</p>

                    <div className={styles.second}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.h3}>{sample.secondHeading}</h3>
                            <p className={styles.intro}>{sample.secondIntro}</p>
                        </div>
                        <SampleAnswer label="21" pages={[4]} captions={sample.viewerCaptions} compact />
                    </div>
                </div>
            </section>

            <section className={styles.escalation} aria-labelledby="v1-escalation">
                <div className={styles.inner}>
                    <div className={styles.sectionHead}>
                        <h2 id="v1-escalation" className={styles.h2}>{escalation.heading}</h2>
                        <p className={styles.intro}>{escalation.body}</p>
                    </div>
                    <div className={styles.pair}>
                        <figure className={styles.example}>
                            <figcaption className={styles.exampleCaption}>{escalation.slipCaption}</figcaption>
                            <div className={styles.slipStage}>
                                <Slip label={hero.slipLabel} reason={escalation.slipReason} detail={escalation.slipText} />
                            </div>
                        </figure>
                        <figure className={styles.example}>
                            <figcaption className={styles.exampleCaption}>{escalation.choiceCaption}</figcaption>
                            <SampleCard label="24(a)" />
                        </figure>
                    </div>
                </div>
            </section>

            <section id="pilot" className={styles.close} aria-labelledby="v1-pilot">
                <div className={styles.inner}>
                    <h2 id="v1-pilot" className={styles.h2}>{close.heading}</h2>
                    <p className={styles.intro}>{close.body}</p>
                    <div className={styles.actions}>
                        <a href={v1.pilot.href} className={styles.primary}>{v1.pilot.label}</a>
                    </div>
                </div>
            </section>
        </div>
    );
}

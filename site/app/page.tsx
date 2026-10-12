import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import AnswerBlock from "@/components/home/AnswerBlock";
import Crop, { pos } from "@/components/home/Crop";
import HeroSheet from "@/components/home/HeroSheet";
import { InkMark, Reveal } from "@/components/home/Ink";
import Rounds from "@/components/home/Rounds";
import Strip from "@/components/home/Strip";
import { HERO_SHEETS, STRIPS, pointsOf, roundsOf } from "@/components/home/sheets";
import s from "@/components/home/Home.module.css";
import { CROPS } from "@/content/sample-marks";
import home from "@/content/home";

export const metadata: Metadata = { title: { absolute: home.meta.title }, description: home.meta.description };

/** A section's heading line: its number in the margin, the heading in the writing column. */
function Head({ n, id, heading, children }: { n: number; id: string; heading: string; children?: React.ReactNode }) {
    return (
        <div className={`${s.line} ${s.head}`}>
            <span className={s.num} aria-hidden="true">{n}</span>
            <div className={s.headText}>
                <h2 id={id} className={s.h2}>{heading}</h2>
                {children}
            </div>
        </div>
    );
}

function More({ href, label }: { href: string; label: string }) {
    return (
        <div className={`${s.line} ${s.more}`}>
            <span />
            <Link href={href} className={s.link}>{label}</Link>
        </div>
    );
}

export default function Home() {
    const { hero, runLine, marked, strips, steps, wrong, honest, audiences, closing } = home;

    // The wrong mark: 35(a)'s vasectomy point, and where the reader missed it
    const wrongPoint = pointsOf(wrong.question).points.find((p) => p.id === wrong.point);
    const wrongCrop = CROPS[`${wrong.question}/${wrong.point}`];
    const missed = HERO_SHEETS.find((h) => h.question === wrong.question)?.points.find((p) => p.id === wrong.point)?.missed;
    const rounds = roundsOf(wrong.question);

    let word = 0;

    return (
        <div className={s.paper}>
            {/* ===== first screen: the headline on the ruled lines, the examined page under it ===== */}
            <section className={`${s.wrap} ${s.heroWrap}`} aria-labelledby="home-title">
                <div className={s.hero}>
                    <h1 id="home-title" className={s.title}>
                        {hero.title.map((line) => (
                            <span key={line} className={s.titleLine}>
                                {line.split(" ").map((w, i) => (
                                    <span key={i}><span className={s.word} style={{ "--w": word++ } as CSSProperties}>{w}</span>{" "}</span>
                                ))}
                            </span>
                        ))}
                    </h1>
                    <div className={s.heroText}>
                        <p className={s.lede}>{hero.lede}</p>
                        <div className={s.actions}>
                            <Link href={hero.primary.href} className={s.primary}>{hero.primary.label}</Link>
                            {hero.secondary && <Link href={hero.secondary.href} className={s.link}>{hero.secondary.label}</Link>}
                        </div>
                    </div>
                    <HeroSheet hero={hero} />
                    <p className={s.note}>{hero.illustration}</p>
                    <p className={s.run}>{runLine.text}</p>
                </div>
            </section>

            {/* ===== one answer, marked ===== */}
            <section id={marked.id} className={`${s.wrap} ${s.section}`} aria-labelledby={`${marked.id}-h`}>
                <Head n={1} id={`${marked.id}-h`} heading={marked.heading}>
                    <p className={s.intro}>{marked.intro}</p>
                </Head>
                {marked.answers.map((a) => <AnswerBlock key={a.question} answer={a} />)}
                <More {...marked.link} />
            </section>

            <Strip spec={STRIPS[0]} alt={strips[0].alt} />

            {/* ===== how a mark is made: four lines on the rules ===== */}
            <section id={steps.id} className={`${s.wrap} ${s.section}`} aria-labelledby={`${steps.id}-h`}>
                <Head n={2} id={`${steps.id}-h`} heading={steps.heading} />
                <ol className={`${s.ruled} ${s.steps}`}>
                    {steps.steps.map((step, i) => (
                        <li key={step.title} className={s.ruledLine}>
                            <span className={s.stepNo} aria-hidden="true">{i + 1}</span>
                            <p><strong>{step.title}</strong> {step.body}</p>
                        </li>
                    ))}
                </ol>
                <More {...steps.link} />
            </section>

            {/* ===== what it got wrong ===== */}
            <section id={wrong.id} className={`${s.wrap} ${s.section}`} aria-labelledby={`${wrong.id}-h`}>
                <Head n={3} id={`${wrong.id}-h`} heading={wrong.heading} />
                <Reveal className={`${s.line} ${s.wrongLine}`}>
                    <div className={s.wrongMargin}>
                        <span className={s.qno}>{wrong.question}</span>
                        <InkMark score={wrongPoint?.score ?? null} max={wrongPoint?.points ?? null} size="xl" />
                    </div>
                    <div className={s.wrongWriting}>
                        <p className={s.wrongLabel}>{wrong.wrongLabel}</p>
                        <Crop page={wrongCrop.page} wide={wrongCrop.wide} tight={{ x: 33, y: 45.4, w: 42, h: 12 }}
                              bands={[]} alt={wrong.missedAlt} className={s.wrongCrop}>
                            {missed && (
                                <svg className={s.ring} style={pos(missed)} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                    <path d="M52 4 C 80 3, 99 22, 98 50 C 97 80, 74 97, 48 96 C 20 95, 2 78, 3 50 C 4 24, 22 6, 56 7"
                                          pathLength={1} vectorEffect="non-scaling-stroke" />
                                </svg>
                            )}
                        </Crop>
                        <div className={s.wrongBody}>
                            <div className={s.prose}>{wrong.body.map((p) => <p key={p}>{p}</p>)}</div>
                            <Rounds labels={wrong.rounds} rounds={rounds.rounds} max={rounds.max} />
                        </div>
                    </div>
                </Reveal>
                <More {...wrong.link} />
            </section>

            <Strip spec={STRIPS[1]} alt={strips[1].alt} />

            {/* ===== what it does well, what it can't do yet ===== */}
            <section id={honest.id} className={`${s.wrap} ${s.section}`} aria-labelledby={`${honest.id}-h`}>
                <Head n={4} id={`${honest.id}-h`} heading={honest.heading} />
                <div className={`${s.line} ${s.groupsLine}`}>
                    <span />
                    <div className={s.groups}>
                        {honest.groups.map((g, gi) => (
                            <div key={g.heading}>
                                <h3 className={s.h3}>{g.heading}</h3>
                                <ul className={s.plainList}>
                                    {g.items.map((item) => (
                                        <li key={item} className={`${s.ruledItem} ${gi === 0 ? s.yes : s.no}`}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`${s.line} ${s.afterLine}`}>
                    <span />
                    <p className={s.after}>{honest.after}</p>
                </div>
            </section>

            {/* ===== who it's for ===== */}
            <section id={audiences.id} className={`${s.wrap} ${s.section}`} aria-labelledby={`${audiences.id}-h`}>
                <Head n={5} id={`${audiences.id}-h`} heading={audiences.heading} />
                <ul className={`${s.ruled} ${s.audiences}`}>
                    {audiences.audiences.map((a) => (
                        <li key={a.name} className={`${s.ruledLine} ${s.audience}`}>
                            <span aria-hidden="true" />
                            <p><strong>{a.name}</strong> {a.body}</p>
                            <Link href={a.link.href} className={s.inlineLink}>{a.link.label}</Link>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ===== closing: the cover's "For examiner's use only" grid ===== */}
            <section className={`${s.wrap} ${s.section} ${s.closing}`} aria-labelledby="closing-h">
                <Head n={6} id="closing-h" heading={closing.heading} />
                <div className={s.line}>
                    <span />
                    <div className={s.closingBody}>
                        <table className={s.grid}>
                            <caption className={s.gridTitle}>{closing.gridTitle}</caption>
                            <thead>
                                <tr>{closing.cells.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr>
                            </thead>
                            <tbody>
                                <tr>{closing.cells.map((c) => <td key={c.label}>{c.value}</td>)}</tr>
                                <tr className={s.terms}>
                                    <th scope="row">{closing.terms.label}</th>
                                    <td colSpan={closing.cells.length - 1}>{closing.terms.value}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className={s.closingSide}>
                            <p className={s.prose}>{closing.body}</p>
                            <div className={s.actions}>
                                <Link href={closing.cta.href} className={s.primary}>{closing.cta.label}</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

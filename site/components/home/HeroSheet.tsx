"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { HomeHero } from "@/content/types";
import { fill } from "@/components/site/format";
import { PAGE_ALT, PAGE_IMAGE, pageSrc, pageSrcSmall } from "@/content/sample-marks";
import { withBase } from "@/lib/base";
import { InkMark, prefersReducedMotion } from "./Ink";
import { HERO_SHEETS, fmtMark, pointsOf, type SheetPoint } from "./sheets";
import styles from "./HeroSheet.module.css";

/* The first screen's timeline (ms from first paint). Words settle 0–700, the scan slides in at 450,
   then each point's highlight draws line by line and its mark is written: about 1.5 s in all.
   On a tab switch the page flips (out 160 ms, in 260 ms) and the highlights redraw from FLIP_START. */
const LOAD_START = 880;
const FLIP_START = 140;
const LINE_STEP = 55;
const BAND_TIME = 260;
const NEXT_POINT = 40;
const OUT_MS = 160;
const IN_MS = 260;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

type Timed = CSSProperties & { "--d": string };
const at = (ms: number): Timed => ({ "--d": `${Math.round(ms)}ms` });
const pct = (n: number) => `${n}%`;

function timeline(points: SheetPoint[], start: number) {
    let t = start;
    return points.map((p) => {
        const bands = p.bands.map((_, i) => t + i * LINE_STEP);
        const mark = t + Math.max(0, p.bands.length - 1) * LINE_STEP + (p.bands.length ? BAND_TIME * 0.6 : 0);
        t = mark + NEXT_POINT + (p.bands.length ? 0 : 120);
        return { bands, mark };
    });
}

/** The hero's live answer sheet: three real answers behind tabs, the scanned page with Gr8r's
 *  highlights and marks, and one row per point of the marking scheme. Pointing at (or focusing, or
 *  tapping) a row lights its evidence on the page and dims the rest. Rendered as grid items of the
 *  hero (the root uses `display: contents`), so the label sits in the answer book's margin. */
export default function HeroSheet({ hero }: { hero: HomeHero }) {
    const [tab, setTab] = useState(0);
    const [pageSel, setPageSel] = useState<number[]>(() => HERO_SHEETS.map((s) => s.pages[0]));
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const [shown, setShown] = useState({ tab: 0, page: HERO_SHEETS[0].pages[0] });
    const [mode, setMode] = useState<"load" | "flip">("load");
    const [mountedAt, setMountedAt] = useState<number | null>(null);

    const sheetRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const busy = useRef(false);
    const dir = useRef(1);
    const target = { tab, page: pageSel[tab] };
    const targetRef = useRef(target);
    useLayoutEffect(() => { targetRef.current = { tab, page: pageSel[tab] }; });

    const sheet = HERO_SHEETS[shown.tab];
    const record = useMemo(() => pointsOf(sheet.question), [sheet.question]);
    const notes = hero.tabs.find((t) => t.question === sheet.question)?.notes ?? {};
    const active = hover ?? pinned;
    const onPage = sheet.points.filter((p) => p.page === shown.page);
    const times = timeline(onPage, mode === "load" ? LOAD_START : FLIP_START);

    // Marks written by JS (the counts) start with the CSS timeline, which began at first paint
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock starts once, after hydration
        setMountedAt(performance.now());
        // Fetch the other pages now, so a flip never slides in an empty frame
        const small = window.innerWidth < 820;
        for (const s of HERO_SHEETS) for (const p of s.pages) {
            const img = new Image();
            img.src = withBase(small ? pageSrcSmall(p) : pageSrc(p));
        }
    }, []);
    const sinceLoad = (ms: number) => (mountedAt == null || mode === "flip" ? 0 : Math.max(0, ms - mountedAt));

    // Page flip: the shown page slides out, the new one slides in and its highlights redraw
    useEffect(() => {
        if (target.tab === shown.tab && target.page === shown.page) return;
        const el = sheetRef.current;
        if (!el || prefersReducedMotion()) {
            setMode("flip");
            setShown(targetRef.current);
            return;
        }
        if (busy.current) return;
        busy.current = true;
        const forward = target.tab > shown.tab || (target.tab === shown.tab && target.page > shown.page);
        dir.current = forward ? 1 : -1;
        const out = el.animate(
            [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-dir.current * 28}px)`, opacity: 0 }],
            { duration: OUT_MS, easing: EASE_OUT, fill: "forwards" },
        );
        out.onfinish = () => {
            busy.current = false;
            setMode("flip");
            setShown(targetRef.current);
        };
    }, [target.tab, target.page, shown.tab, shown.page]);

    const first = useRef(true);
    useLayoutEffect(() => {
        if (first.current) { first.current = false; return; }
        const el = sheetRef.current;
        if (!el) return;
        el.getAnimations().forEach((a) => a.cancel());
        if (prefersReducedMotion()) return;
        el.animate(
            [{ transform: `translateX(${dir.current * 28}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
            { duration: IN_MS, easing: EASE_OUT },
        );
    }, [shown.tab, shown.page]);

    const choose = (i: number) => {
        setTab(i);
        setHover(null);
        setPinned(null);
    };

    const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        const n = HERO_SHEETS.length;
        const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n
            : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
        if (next == null) return;
        e.preventDefault();
        choose(next);
        tabRefs.current[next]?.focus();
    };

    const point = (id: string) => sheet.points.find((p) => p.id === id);
    const lightUp = (id: string | null) => {
        setHover(id);
        const p = id ? point(id) : undefined;
        if (p && p.page !== pageSel[shown.tab]) setPageSel((s) => s.map((v, i) => (i === shown.tab ? p.page : v)));
    };

    const total = { score: record.score, max: record.max };
    const panelId = "hero-sheet-panel";
    const alt = `${PAGE_ALT[shown.page] ?? ""} ${hero.marksAlt}`;

    return (
        <div className={styles.root}>
            <div className={styles.label} aria-hidden="true">
                <span className={styles.qno}>{sheet.question}</span>
                <InkMark score={total.score} max={total.max} size="l" tick={false}
                         when={mountedAt != null} delay={sinceLoad(1500)} />
            </div>

            <div className={styles.tabsRow}>
                <div role="tablist" aria-label={hero.tabsLabel} className={styles.tabs}>
                    {HERO_SHEETS.map((s, i) => (
                        <button key={s.question} ref={(el) => { tabRefs.current[i] = el; }}
                                type="button" role="tab" id={`hero-tab-${i}`} aria-selected={tab === i}
                                aria-controls={panelId} tabIndex={tab === i ? 0 : -1}
                                className={styles.tab} onClick={() => choose(i)} onKeyDown={(e) => onTabKey(e, i)}>
                            {s.question}
                        </button>
                    ))}
                </div>
                {sheet.pages.length > 1 ? (
                    <div className={styles.pages}>
                        {sheet.pages.map((p) => (
                            <button key={p} type="button" className={styles.pageButton} aria-pressed={shown.page === p}
                                    onClick={() => setPageSel((s) => s.map((v, i) => (i === shown.tab ? p : v)))}>
                                {fill(hero.page, { page: p })}
                            </button>
                        ))}
                    </div>
                ) : (
                    <span className={styles.pageNote}>{fill(hero.page, { page: shown.page })}</span>
                )}
            </div>

            <div id={panelId} role="tabpanel" aria-labelledby={`hero-tab-${tab}`} className={styles.panel}>
                <div ref={sheetRef} className={styles.sheet} data-mode={mode} data-active={active ? "" : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img key={shown.page} src={withBase(pageSrc(shown.page))}
                         srcSet={`${withBase(pageSrcSmall(shown.page))} 720w, ${withBase(pageSrc(shown.page))} 1348w`}
                         sizes="(max-width: 1023px) 92vw, 720px"
                         width={PAGE_IMAGE.width} height={PAGE_IMAGE.height} alt={alt}
                         className={styles.scan} fetchPriority="high" decoding="async" />
                    <div className={styles.marks} key={`${shown.tab}-${shown.page}`} aria-hidden="true">
                        {onPage.map((p, pi) => {
                            const on = active === p.id;
                            const r = record.points.find((c) => c.id === p.id);
                            return (
                                <div key={p.id} data-on={on ? "" : undefined} className={styles.point}>
                                    {p.bands.map((b, bi) => (
                                        <span key={bi} className={styles.band} style={{
                                            left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h), ...at(times[pi].bands[bi]),
                                        }} />
                                    ))}
                                    {p.missed && (
                                        <svg className={styles.ring} viewBox="0 0 100 100" preserveAspectRatio="none" style={{
                                            left: pct(p.missed.x), top: pct(p.missed.y), width: pct(p.missed.w), height: pct(p.missed.h), ...at(times[pi].mark),
                                        }}>
                                            <path d="M52 4 C 80 3, 99 22, 98 50 C 97 80, 74 97, 48 96 C 20 95, 2 78, 3 50 C 4 24, 22 6, 56 7" pathLength={1} vectorEffect="non-scaling-stroke" />
                                        </svg>
                                    )}
                                    <span className={styles.scanMark} style={{ left: pct(p.mark.left), top: pct(p.mark.top), ...at(times[pi].mark) }}>
                                        <svg className={styles.scanTick} viewBox="0 0 24 24" focusable="false">
                                            {r?.score === 0
                                                ? <path d="M5 5 L19 19 M19 5 L5 19" pathLength={1} />
                                                : <path d="M3 13.5 L9 19.5 L21.5 4.5" pathLength={1} />}
                                        </svg>
                                        <span>{fmtMark(r?.score)}/{fmtMark(r?.points)}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={styles.rows}>
                <p className="sr-only">{hero.rowsHint}</p>
                <ul className={styles.list} data-active={active ? "" : undefined}>
                    {record.points.map((r, i) => {
                        const note = notes[r.id];
                        const on = active === r.id;
                        return (
                            <li key={`${sheet.question}-${r.id}`} data-on={on ? "" : undefined}>
                                <button type="button" className={styles.row} aria-pressed={pinned === r.id}
                                        onMouseEnter={() => lightUp(r.id)} onMouseLeave={() => setHover(null)}
                                        onFocus={() => lightUp(r.id)} onBlur={() => setHover(null)}
                                        onClick={() => { setPinned((v) => (v === r.id ? null : r.id)); lightUp(r.id); }}>
                                    <InkMark score={r.score} max={r.points} size="m" className={styles.rowMark}
                                             when={mountedAt != null} delay={mode === "load" ? sinceLoad(1100 + i * 220) : 120 + i * 60} />
                                    <span className={styles.rowText}>
                                        <span className={styles.pointText}>{r.description}</span>
                                        {note && (
                                            <span className={styles.note}>
                                                {note.label && <strong>{note.label} </strong>}{note.text}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

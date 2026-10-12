import type { CSSProperties } from "react";
import { PAGE_IMAGE, pageSrc } from "@/content/sample-marks";
import { withBase } from "@/lib/base";
import { InkMark, Reveal } from "./Ink";
import { PAGE_RULES, pointsOf, type StripSpec } from "./sheets";
import styles from "./Strip.module.css";

/** A full-bleed band of one scanned page at reading size, laid across the answer book so the scan's
 *  own printed red margin rule lines up with the site's. The quoted words are highlighted (drawn in
 *  on first view) and Gr8r's mark is written in the scan's right margin. The page drifts a little
 *  as it scrolls past (CSS scroll timeline; off under reduced motion). */
export default function Strip({ spec, alt }: { spec: StripSpec; alt: string }) {
    const rules = PAGE_RULES[spec.page];
    const p = pointsOf(spec.question).points.find((c) => c.id === spec.point);
    const top = Math.min(...spec.bands.map((b) => b.y));
    const bottom = Math.max(...spec.bands.map((b) => b.y + b.h));
    const markY = ((top + bottom) / 2 / 100) * PAGE_IMAGE.height - spec.y0;
    const vars = {
        "--y0": spec.y0,
        "--rows": spec.y1 - spec.y0,
        "--rx": rules.left,
        "--rr": rules.right,
        "--my": markY,
    } as CSSProperties;

    return (
        <Reveal as="figure" className={styles.strip} style={vars}>
            <div className={styles.window}>
                <div className={styles.sheet}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img src={withBase(pageSrc(spec.page))} width={PAGE_IMAGE.width} height={PAGE_IMAGE.height} alt={alt}
                         loading="lazy" decoding="async" />
                    {spec.bands.map((b, i) => (
                        <span key={i} className={styles.band} aria-hidden="true" style={{
                            left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, "--i": i,
                        } as CSSProperties} />
                    ))}
                </div>
            </div>
            <InkMark score={p?.score ?? null} max={p?.points ?? null} size="xl" className={styles.mark} delay={260} />
        </Reveal>
    );
}

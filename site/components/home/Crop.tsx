import type { CSSProperties, ReactNode } from "react";
import { PAGE_IMAGE, pageSrc, type Box } from "@/content/sample-marks";
import { withBase } from "@/lib/base";
import styles from "./Crop.module.css";

/** CSS variables that place the whole page behind a crop window (see `.page` in the CSS). */
function place(prefix: "t" | "w", box: Box): Record<string, string> {
    return {
        [`--${prefix}-ratio`]: `${(box.w * PAGE_IMAGE.width) / (box.h * PAGE_IMAGE.height)}`,
        [`--${prefix}-pw`]: `${(100 / box.w) * 100}%`,
        [`--${prefix}-pl`]: `${(-box.x / box.w) * 100}%`,
        [`--${prefix}-pt`]: `${(-box.y / box.h) * 100}%`,
        [`--${prefix}-srcw`]: `${(box.w / 100) * PAGE_IMAGE.width}`,
    };
}

const pos = (b: Box): CSSProperties => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });

/** A window onto a real scanned page at reading size, with highlighter bands over the quoted words.
 *  The bands draw in when an ancestor gets `data-seen` (see Reveal in Ink.tsx). A phone shows the
 *  `tight` window, wider screens the `wide` one. `children` are drawn in page coordinates too. */
export default function Crop({ page, wide, tight, bands, alt, children, className }: {
    page: number; wide: Box; tight: Box; bands: Box[]; alt: string; children?: ReactNode; className?: string;
}) {
    const vars = { ...place("t", tight), ...place("w", wide) } as CSSProperties;
    return (
        <div className={className ? `${styles.crop} ${className}` : styles.crop} style={vars}>
            <div className={styles.frame}>
                <div className={styles.page}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img src={withBase(pageSrc(page))} width={PAGE_IMAGE.width} height={PAGE_IMAGE.height} alt={alt}
                         loading="lazy" decoding="async" />
                    {bands.map((b, i) => (
                        <span key={i} className={styles.band} aria-hidden="true"
                              style={{ ...pos(b), "--i": i } as CSSProperties} />
                    ))}
                    {children}
                </div>
            </div>
        </div>
    );
}

export { pos };

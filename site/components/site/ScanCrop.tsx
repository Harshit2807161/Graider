import type { CSSProperties } from "react";
import { PAGE_IMAGE, pageSrc, type Box, type Crop } from "@/content/sample-marks";
import { withBase } from "@/lib/base";
import styles from "./CriterionRows.module.css";

/** The CSS variables that place the whole page behind a crop window (see `.crop` in the CSS). */
function place(prefix: "t" | "w", box: Box): Record<string, string> {
    return {
        [`--${prefix}-ratio`]: `${(box.w * PAGE_IMAGE.width) / (box.h * PAGE_IMAGE.height)}`,
        [`--${prefix}-pw`]: `${(100 / box.w) * 100}%`,
        [`--${prefix}-pl`]: `${(-box.x / box.w) * 100}%`,
        [`--${prefix}-pt`]: `${(-box.y / box.h) * 100}%`,
        [`--${prefix}-srcw`]: `${(box.w / 100) * PAGE_IMAGE.width}`,
    };
}

/** A window onto a real scanned page, with the quoted evidence highlighted. A phone shows the
 *  `tight` window (the words that carry the mark, large enough to read); wider screens the `wide` one. */
export default function ScanCrop({ crop, caption }: { crop: Crop; caption: string }) {
    const vars = { ...place("t", crop.tight), ...place("w", crop.wide) } as CSSProperties;
    return (
        <figure className={styles.crop} style={vars}>
            <div className={styles.frame}>
                <div className={styles.page}>
                    {/* Four small page images in all, each reused by several crops: loaded eagerly so a
                        highlight never sits on an empty frame. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img src={withBase(pageSrc(crop.page))} width={PAGE_IMAGE.width} height={PAGE_IMAGE.height} alt={crop.alt}
                         decoding="async" />
                    {crop.bands.map((band, i) => (
                        <span key={i} className={styles.band} aria-hidden="true"
                              style={{ left: `${band.x}%`, top: `${band.y}%`, width: `${band.w}%`, height: `${band.h}%` }} />
                    ))}
                </div>
            </div>
            <figcaption className={styles.cropCaption}>{caption}</figcaption>
        </figure>
    );
}

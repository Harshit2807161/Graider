import type { CSSProperties } from "react";
import { withBase } from "@/lib/base";
import { PAGE, type Box, type Crop } from "./marks";
import styles from "./book.module.css";

/** The CSS variables that place the whole page behind a crop window (see `.crop` in the CSS). */
function place(prefix: "t" | "w", box: Box): Record<string, string> {
    return {
        [`--${prefix}-ratio`]: `${(box.w * PAGE.width) / (box.h * PAGE.height)}`,
        [`--${prefix}-pw`]: `${(100 / box.w) * 100}%`,
        [`--${prefix}-pl`]: `${(-box.x / box.w) * 100}%`,
        [`--${prefix}-pt`]: `${(-box.y / box.h) * 100}%`,
        [`--${prefix}-srcw`]: `${(box.w / 100) * PAGE.width}`,
    };
}

function pad(page: number): string {
    return String(page).padStart(2, "0");
}

/** A window onto a real scanned page, with the evidence highlighted. `delays` (ms, one per band)
 *  sequence the bands on load; without them the bands are simply there. */
export default function ScanCrop({ crop, alt, caption, delays }: {
    crop: Crop;
    alt: string;
    caption: string;
    delays?: number[];
}) {
    const vars = { ...place("t", crop.tight), ...place("w", crop.wide) } as CSSProperties;
    return (
        <figure className={styles.crop} style={vars}>
            <div className={styles.frame}>
                <div className={styles.page}>
                    {/* Three small page images in all, each reused by several crops: loaded eagerly so the
                        highlight never lands on an empty frame. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                    <img src={withBase(`/sample/pages/p${pad(crop.page)}.webp`)} width={PAGE.width} height={PAGE.height} alt={alt} />
                    {crop.bands.map((band, i) => (
                        <span key={i} className={styles.band} aria-hidden="true"
                              style={{
                                  left: `${band.x}%`, top: `${band.y}%`, width: `${band.w}%`, height: `${band.h}%`,
                                  ...(delays ? { "--d": `${delays[i] ?? 0}ms` } : {}),
                              } as CSSProperties} />
                    ))}
                </div>
            </div>
            <figcaption className={styles.cropCaption}>{caption}</figcaption>
        </figure>
    );
}

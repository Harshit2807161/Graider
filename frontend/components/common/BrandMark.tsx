import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./BrandMark.module.css";

interface BrandMarkProps {
    /** Colour scheme of the surface the mark sits on */
    tone?: "dark" | "light" | "brand";
    size?: "md" | "lg";
    className?: string;
}

/**
 * The Gr8r mark: two ticks (the grader and the second examiner) on an indigo tile, plus the wordmark.
 * Decorative icon; the wordmark carries the name.
 */
export default function BrandMark({ tone = "light", size = "md", className }: BrandMarkProps) {
    return (
        <span className={cn(styles.mark, styles[tone], styles[size], className)}>
            <span className={styles.tile} aria-hidden="true">
                <CheckCheck size={size === "lg" ? 22 : 18} strokeWidth={2.5} />
            </span>
            <span className={styles.word}>Gr8r</span>
        </span>
    );
}

import type { RunLine as RunLineContent } from "@/content/types";
import styles from "./RunLine.module.css";

/** The one sentence of measured fact under a hero, with a rule above it. */
export default function RunLine({ run, className }: { run: RunLineContent; className?: string }) {
    return <p className={className ? `${styles.run} ${className}` : styles.run}>{run.text}</p>;
}

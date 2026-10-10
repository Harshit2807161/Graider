import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BrandMark from "@/components/common/BrandMark";
import styles from "./page.module.css";

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.inner}>
                <BrandMark size="lg" />
                <h1 className={styles.title}>Handwritten exams, graded against your rubric.</h1>
                <p className={styles.lead}>
                    Gr8r reads each student&apos;s answer sheet, grades every answer against your rubric with a second
                    AI examiner checking, and sends anything it isn&apos;t sure about to you.
                </p>
                <Link href="/login" className={styles.cta}>
                    Sign in <ArrowRight size={18} aria-hidden="true" />
                </Link>
            </div>
        </main>
    );
}

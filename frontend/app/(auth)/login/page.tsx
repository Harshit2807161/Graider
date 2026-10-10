import { AlertTriangle, CheckCheck, Quote, ScanText, ShieldCheck, UserCheck } from "lucide-react";
import LoginForm from "@/components/features/auth/LoginForm";
import BrandMark from "@/components/common/BrandMark";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Sign in" };

const points = [
    {
        icon: ScanText,
        title: "Reads handwritten answers",
        text: "PDFs or photos of each page. Every answer is matched to its question.",
    },
    {
        icon: ShieldCheck,
        title: "Grades against your rubric, then checks itself",
        text: "Each grade quotes the student's own words; a second AI examiner checks it.",
    },
    {
        icon: UserCheck,
        title: "Sends you what it isn't sure about",
        text: "Missing answers, unclear writing and disagreements come to you to decide.",
    },
];

export default function LoginPage() {
    return (
        <div className={styles.container}>
            <main className={styles.formSection}>
                <div className={styles.formContainer}>
                    <div className={styles.mobileBrand}>
                        <BrandMark size="lg" />
                    </div>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Sign in to Gr8r</h1>
                        <p className={styles.subtitle}>Grade handwritten answer sheets, review what needs you, and publish results.</p>
                    </div>
                    <LoginForm />
                    <p className={styles.help}>
                        No account yet? Teachers are added by their school&apos;s Gr8r administrator.
                    </p>
                    <p className={styles.mobileBlurb}>
                        Gr8r reads handwritten answers, grades them against your rubric with a second AI examiner
                        checking, and sends anything uncertain to you.
                    </p>
                </div>
            </main>

            {/* Shown first on wide screens; after the form for screen readers */}
            <aside className={styles.brandSection} aria-labelledby="brand-heading">
                <BrandMark tone="brand" size="lg" />
                <div className={styles.brandContent}>
                    <h2 id="brand-heading" className={styles.tagline}>
                        Handwritten exams, graded against your rubric. You make the hard calls.
                    </h2>

                    {/* A glimpse of a graded answer; the list below says the same in words */}
                    <div className={styles.glimpse} aria-hidden="true">
                        <div className={styles.glimpseCard}>
                            <div className={styles.glimpseHead}>
                                <span className={styles.glimpseLabel}>Q2</span>
                                <span className={styles.glimpseQuestion}>How many books are on the shelf?</span>
                                <span className={styles.glimpseScore}><strong>2</strong> / 2</span>
                            </div>
                            <p className={styles.glimpseTranscript}>9 + 7 = <mark>16 books</mark></p>
                            <ul className={styles.glimpseChecks}>
                                <li><Quote size={14} /> Evidence: &ldquo;16 books&rdquo;</li>
                                <li className={styles.glimpseAgree}><CheckCheck size={14} /> Second examiner agrees</li>
                            </ul>
                        </div>
                        <div className={styles.glimpseFlag}>
                            <span className={styles.glimpseFlagIcon}><AlertTriangle size={16} /></span>
                            <span>
                                <strong>Q3 sent to you</strong>
                                <span>The examiners disagreed on the drawing</span>
                            </span>
                        </div>
                    </div>

                    <ul className={styles.points}>
                        {points.map(({ icon: Icon, title, text }) => (
                            <li key={title} className={styles.point}>
                                <span className={styles.pointIcon} aria-hidden="true"><Icon size={18} /></span>
                                <span>
                                    <span className={styles.pointTitle}>{title}</span>
                                    <span className={styles.pointText}>{text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}

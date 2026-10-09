import { ScanText, ShieldCheck, UserCheck } from "lucide-react";
import LoginForm from "@/components/features/auth/LoginForm";
import BrandMark from "@/components/common/BrandMark";
import styles from "./page.module.css";

const points = [
    {
        icon: ScanText,
        title: "Reads handwritten answers",
        text: "Upload a PDF or photos of each answer sheet. Every page is read and each answer matched to its question.",
    },
    {
        icon: ShieldCheck,
        title: "Grades against your rubric, then checks itself",
        text: "Each grade quotes the student's own words as evidence, and a second AI examiner checks it independently.",
    },
    {
        icon: UserCheck,
        title: "Sends you what it isn't sure about",
        text: "Missing answers, hard-to-read writing and disagreements between the examiners are flagged for you to decide.",
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
                        <h1 className={styles.title}>Sign in</h1>
                        <p className={styles.subtitle}>Welcome back. Sign in to grade, review and publish results.</p>
                    </div>
                    <LoginForm />
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

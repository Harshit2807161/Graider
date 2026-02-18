import LoginForm from "@/components/features/auth/LoginForm";
import styles from "./page.module.css";

export default function LoginPage() {
    return (
        <div className={styles.container}>
            {/* Left Side: Brand / Hero */}
            <div className={styles.brandSection}>
                <div className={styles.brandContent}>
                    <h1 className={styles.logo}>Graider</h1>
                    <p className={styles.tagline}>
                        AI-Powered Grading for Modern Education.
                    </p>
                    <div className={styles.testimonial}>
                        "Automate your grading workflow with 99% accuracy."
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSection}>
                <div className={styles.formContainer}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Welcome back</h2>
                        <p className={styles.subtitle}>
                            Please enter your details to sign in.
                        </p>
                    </div>
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}

import Link from "next/link";
import site from "@/content/site";
import styles from "./Footer.module.css";

/** The site footer: who we are, three links, and the contact address once it is a real one. */
export default function Footer() {
    const email = site.contactEmail.startsWith("TODO") ? null : site.contactEmail;
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <p className={styles.line} translate="no">{site.footerLine}</p>
                <nav aria-label="Footer">
                    <ul className={styles.links}>
                        {site.footerNav.map((item) => (
                            <li key={item.href}><Link href={item.href} className={styles.link}>{item.label}</Link></li>
                        ))}
                        {email && <li><a href={`mailto:${email}`} className={styles.link}>{email}</a></li>}
                    </ul>
                </nav>
            </div>
        </footer>
    );
}

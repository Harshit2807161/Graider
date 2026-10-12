import Link from "next/link";
import site from "@/content/site";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <p>{site.name} · {site.company} · {site.city}</p>
            <nav className={styles.nav} aria-label="Footer">
                {site.footerNav.map((item) => (
                    <Link key={item.href} href={item.href}>{item.label}</Link>
                ))}
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </nav>
        </footer>
    );
}

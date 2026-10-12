import Link from "next/link";
import site from "@/content/site";
import styles from "./Header.module.css";

export default function Header() {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.brand}>{site.name}</Link>
            <nav className={styles.nav} aria-label="Main">
                {site.nav.map((item) => (
                    <Link key={item.href} href={item.href} className={styles.link}>{item.label}</Link>
                ))}
                <Link href="/pilot/" className={styles.cta}>{site.cta.pilot}</Link>
            </nav>
        </header>
    );
}

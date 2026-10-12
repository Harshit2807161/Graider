import Link from "next/link";
import site from "@/content/site";
import copy from "./copy";
import styles from "./SiteHeader.module.css";

/** v2's header: the name, five text links and the one indigo button. On a phone the links take a
 *  second row, so nothing hides behind a menu. */
export default function SiteHeader() {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand} translate="no">{site.name}</Link>
                <nav className={styles.nav} aria-label="Main">
                    {copy.nav.map((item) => (
                        <Link key={item.href} href={item.href} className={styles.link}>{item.label}</Link>
                    ))}
                </nav>
                <Link href={copy.pilot.href} className={styles.button}>{copy.pilot.label}</Link>
            </div>
        </header>
    );
}

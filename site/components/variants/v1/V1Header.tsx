import { v1 } from "./copy";
import styles from "./V1Header.module.css";

function Links({ className }: { className: string }) {
    return (
        <ul className={className}>
            {v1.nav.map((item) => (
                <li key={item.label}><a href={item.href} className={styles.link}>{item.label}</a></li>
            ))}
        </ul>
    );
}

/** v1's header: the name, five text links and the one indigo button. On a phone the links sit
 *  behind a Menu disclosure so the headline and the button stay on the first screen. */
export default function V1Header() {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <a href="#" className={styles.brand} translate="no">{v1.brand}</a>
                <nav className={styles.nav} aria-label="Main">
                    <Links className={styles.links} />
                    <details className={styles.menu}>
                        <summary className={styles.menuButton}>{v1.menu}</summary>
                        <Links className={styles.menuLinks} />
                    </details>
                </nav>
                <a href={v1.pilot.href} className={styles.button}>{v1.pilot.label}</a>
            </div>
        </header>
    );
}

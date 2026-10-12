import copy from "./copy";
import styles from "./book.module.css";

/** The book's top strip: the name in the margin column, the nav and the one button in the writing
 *  area. On a phone the five links fold into a native disclosure, so the button stays in view. */
export default function BookHeader() {
    const links = (listClass: string) => (
        <ul className={listClass}>
            {copy.nav.map((item) => (
                <li key={item.label}><a href={item.href} className={styles.navLink}>{item.label}</a></li>
            ))}
        </ul>
    );
    return (
        <header className={`${styles.row} ${styles.header}`}>
            <div className={styles.margin}>
                <a href="#" className={styles.brand} translate="no">{copy.brand}</a>
            </div>
            <div className={styles.writing}>
                <div className={styles.headerBar}>
                    <nav aria-label="Main" className={styles.headerMain}>
                        {links(styles.navList)}
                        <details className={styles.menu}>
                            <summary>{copy.menuLabel}</summary>
                            {links(styles.menuList)}
                        </details>
                    </nav>
                    <a href={copy.pilot.href} className={`${styles.button} ${styles.buttonSmall}`}>{copy.pilot.label}</a>
                </div>
            </div>
        </header>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import site from "@/content/site";
import styles from "./Header.module.css";

/** The site header: the name, five text links and the one indigo button. On a phone the links sit
 *  behind a Menu disclosure so the headline and the button stay on the first screen. It must stay a
 *  direct child of <body>: the design variants hide it on their routes with `body:has(...) > header`. */
export default function Header() {
    const pathname = usePathname();
    const menuRef = useRef<HTMLDetailsElement>(null);

    // The header outlives client-side navigation, so close the phone menu when the page changes
    useEffect(() => {
        if (menuRef.current) menuRef.current.open = false;
    }, [pathname]);

    const links = (className: string) => (
        <ul className={className}>
            {site.nav.map((item) => {
                const current = pathname === item.href || pathname === item.href.replace(/\/$/, "");
                return (
                    <li key={item.href}>
                        <Link href={item.href} className={styles.link} aria-current={current ? "page" : undefined}>
                            {item.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand} translate="no">{site.name}</Link>
                <nav className={styles.nav} aria-label="Main">
                    {links(styles.links)}
                    <details ref={menuRef} className={styles.menu}
                             onKeyDown={(e) => {
                                 if (e.key === "Escape" && menuRef.current?.open) {
                                     menuRef.current.open = false;
                                     menuRef.current.querySelector("summary")?.focus();
                                 }
                             }}>
                        <summary className={styles.menuButton}>{site.menuLabel}</summary>
                        {links(styles.menuLinks)}
                    </details>
                </nav>
                <Link href="/pilot/" className={styles.button}>{site.cta.pilot}</Link>
            </div>
        </header>
    );
}

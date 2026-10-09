"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, GraduationCap, FileText, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/context/OrgContext";
import BrandMark from "./BrandMark";
import styles from "./Sidebar.module.css";

const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/orgs", label: "Organizations", icon: Building2, exact: false },
    { href: "/dashboard/classes", label: "Classes", icon: GraduationCap, exact: false },
    { href: "/dashboard/exams", label: "Exams", icon: FileText, exact: false },
];

const DESKTOP_QUERY = "(min-width: 1024px)";
const FOCUSABLE = 'a[href], button:not([disabled])';

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/**
 * The portal's navigation. From 1024px it is a fixed dark sidebar; below that it collapses
 * into a top bar whose Menu button opens it as a drawer (Escape, the backdrop or the close
 * button shut it, focus stays inside while open and goes back to the Menu button).
 */
export default function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();
    const { activeOrg, isLoading: orgsLoading } = useOrgContext();
    const [open, setOpen] = useState(false);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const close = useCallback((returnFocus: boolean) => {
        setOpen(false);
        if (returnFocus) toggleRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!open) return;
        const drawer = drawerRef.current;
        closeRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                close(true);
                return;
            }
            if (e.key !== "Tab" || !drawer) return;
            const items = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter((el) => el.offsetParent !== null);
            if (items.length === 0) return;
            const [head, tail] = [items[0], items[items.length - 1]];
            if (e.shiftKey && document.activeElement === head) {
                e.preventDefault();
                tail.focus();
            } else if (!e.shiftKey && document.activeElement === tail) {
                e.preventDefault();
                head.focus();
            }
        };

        // Widening past the breakpoint turns the drawer back into the sidebar
        const desktop = window.matchMedia(DESKTOP_QUERY);
        const onResize = (e: MediaQueryListEvent) => e.matches && setOpen(false);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        desktop.addEventListener("change", onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKey);
            desktop.removeEventListener("change", onResize);
        };
    }, [open, close]);

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    // Only a modal dialog while it is open as a drawer; otherwise a plain sidebar landmark
    const dialogProps = open
        ? { role: "dialog" as const, "aria-modal": true, "aria-label": "Navigation" }
        : {};

    return (
        <>
            <header className={styles.topbar}>
                <button
                    ref={toggleRef}
                    type="button"
                    className={styles.menuBtn}
                    onClick={() => setOpen(true)}
                    aria-expanded={open}
                    aria-controls="app-sidebar"
                >
                    <Menu size={20} aria-hidden="true" />
                    <span className="sr-only">Menu</span>
                </button>
                <Link href="/dashboard" className={styles.topbarBrand} aria-label="Gr8r, overview">
                    <BrandMark tone="dark" />
                </Link>
                {activeOrg && <span className={styles.topbarOrg} title={activeOrg.name}>{activeOrg.name}</span>}
            </header>

            {open && <div className={styles.backdrop} onClick={() => close(true)} aria-hidden="true" />}

            <aside
                id="app-sidebar"
                ref={drawerRef}
                className={cn(styles.sidebar, open && styles.open)}
                {...dialogProps}
            >
                <div className={styles.brandRow}>
                    <Link href="/dashboard" className={styles.brandLink} aria-label="Gr8r, overview"
                          onClick={() => setOpen(false)}>
                        <BrandMark tone="dark" />
                    </Link>
                    <button
                        ref={closeRef}
                        type="button"
                        className={styles.closeBtn}
                        onClick={() => close(true)}
                    >
                        <X size={20} aria-hidden="true" />
                        <span className="sr-only">Close menu</span>
                    </button>
                </div>

                <div className={styles.orgCard}>
                    {orgsLoading && !activeOrg ? (
                        <span className={styles.orgSkeleton} aria-hidden="true" />
                    ) : (
                        <>
                            <span className={styles.orgAvatar} aria-hidden="true">
                                {activeOrg ? initials(activeOrg.name) : <Building2 size={14} />}
                            </span>
                            <span className={styles.orgText}>
                                <span className={styles.orgLabel}>Organization</span>
                                <span className={styles.orgName} title={activeOrg?.name}>
                                    {activeOrg?.name ?? "None yet"}
                                </span>
                            </span>
                        </>
                    )}
                </div>

                <nav className={styles.nav} aria-label="Main">
                    <ul className={styles.navList}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href, item.exact);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={cn(styles.navItem, active && styles.active)}
                                        aria-current={active ? (pathname === item.href ? "page" : "true") : undefined}
                                        onClick={() => setOpen(false)}
                                    >
                                        <Icon size={18} aria-hidden="true" />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className={styles.footer}>
                    <button type="button" onClick={logout} className={styles.logoutBtn}>
                        <LogOut size={18} aria-hidden="true" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

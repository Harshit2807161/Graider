"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ChevronsUpDown, GraduationCap, FileText, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/context/OrgContext";
import { CurrentUser, userService } from "@/services/user.service";
import BrandMark from "./BrandMark";
import { focusMainContent } from "./focus";
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
    const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
    if (words.length === 0) return "?";
    return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** Who is signed in, and where. With more than one organization it links to the list to switch. */
function AccountBlock({ switchable, onNavigate, title, children }: {
    switchable: boolean;
    onNavigate: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    return switchable ? (
        <Link href="/dashboard/orgs" className={cn(styles.account, styles.accountLink)} onClick={onNavigate} title={title}>
            {children}
        </Link>
    ) : (
        <p className={styles.account} title={title}>{children}</p>
    );
}

/**
 * The portal's navigation. From 1024px it is a fixed dark sidebar; below that it collapses
 * into a top bar whose Menu button opens it as a drawer (Escape, the backdrop or the close
 * button shut it, focus stays inside while open and goes back to the Menu button).
 * The footer says who is signed in and in which organization, next to Sign out.
 */
export default function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();
    const { orgs, activeOrg, isLoading: orgsLoading } = useOrgContext();
    const [open, setOpen] = useState(false);
    // undefined while loading, null if it couldn't be loaded (the footer then shows the organization only)
    const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let cancelled = false;
        userService.me()
            .then((me) => !cancelled && setUser(me))
            .catch(() => !cancelled && setUser(null));
        return () => {
            cancelled = true;
        };
    }, []);

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

    // A link followed from the drawer: the drawer, and the link with it, go away, so focus starts at the
    // top of the new page instead of falling back to <body>. The fixed sidebar stays, and so does focus.
    const followLink = () => {
        if (!open) return;
        setOpen(false);
        focusMainContent();
    };

    const userName = user?.full_name?.trim() || user?.email || "";

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
                          onClick={followLink}>
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
                                        onClick={followLink}
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
                    {user === undefined || (orgsLoading && !activeOrg) ? (
                        <div className={styles.account} aria-hidden="true">
                            <span className={cn(styles.avatar, styles.skeleton)} />
                            <span className={styles.accountText}>
                                <span className={cn(styles.skeletonLine, styles.skeleton)} />
                                <span className={cn(styles.skeletonLineShort, styles.skeleton)} />
                            </span>
                        </div>
                    ) : (
                        <AccountBlock
                            switchable={orgs.length > 1}
                            onNavigate={followLink}
                            title={[userName, user?.email !== userName ? user?.email : null, activeOrg?.name]
                                .filter(Boolean).join("\n") || undefined}
                        >
                            <span className={styles.avatar} aria-hidden="true">
                                {user ? initials(userName) : <Building2 size={16} />}
                            </span>
                            <span className={styles.accountText}>
                                {user && (
                                    <>
                                        <span className="sr-only">Signed in as </span>
                                        <span className={styles.userName}>{userName}</span>
                                        <span className="sr-only">, </span>
                                    </>
                                )}
                                <span className={styles.orgName}>{activeOrg?.name ?? "No organization yet"}</span>
                                {orgs.length > 1 && <span className="sr-only">. Switch organization</span>}
                            </span>
                            {orgs.length > 1 && <ChevronsUpDown size={16} aria-hidden="true" className={styles.switchIcon} />}
                        </AccountBlock>
                    )}
                    <button type="button" onClick={logout} className={styles.logoutBtn}>
                        <LogOut size={18} aria-hidden="true" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

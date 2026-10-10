"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Keeps unsaved edits from being lost by accident. While `dirty`:
 *  - closing or reloading the tab asks first (the browser's own prompt), and
 *  - a click on a link to another page of the app is held back; `pendingHref` is set so the page can
 *    ask in its own dialog, then `leave()` goes there or `stay()` drops it.
 *  In-page anchors (#section), new-tab clicks and links that open elsewhere are left alone. */
export function useUnsavedChangesGuard(dirty: boolean) {
    const router = useRouter();
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Older browsers only show the prompt when returnValue is set
            e.returnValue = "";
        };
        // Capture phase, before Next's <Link> handles the click
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;
            e.preventDefault();
            e.stopPropagation();
            setPendingHref(url.pathname + url.search + url.hash);
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        document.addEventListener("click", onClick, true);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            document.removeEventListener("click", onClick, true);
        };
    }, [dirty]);

    const leave = useCallback(() => {
        if (!pendingHref) return;
        const href = pendingHref;
        setPendingHref(null);
        router.push(href);
    }, [pendingHref, router]);

    const stay = useCallback(() => setPendingHref(null), []);

    return { pendingHref, leave, stay };
}

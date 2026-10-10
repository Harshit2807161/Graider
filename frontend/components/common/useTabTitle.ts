import { useEffect } from "react";

/**
 * Name the browser tab once a client page's data has loaded (e.g. "Kabir Singh · Gr8r").
 *
 * The route's layout.tsx gives a `placeholder` title ("Answer sheet · Gr8r") for the first paint. Next
 * writes that title as its metadata streams in, which can land after the page's data, so whenever the
 * placeholder reappears it is replaced again. Only the placeholder is replaced: after leaving the page the
 * next route's own title is left alone.
 */
export function useTabTitle(title: string | null, placeholder: string): void {
    useEffect(() => {
        if (!title) return;
        document.title = title;
        const observer = new MutationObserver(() => {
            if (document.title === placeholder) document.title = title;
        });
        observer.observe(document.head, { subtree: true, childList: true, characterData: true });
        return () => observer.disconnect();
    }, [title, placeholder]);
}

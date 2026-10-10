import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while the server renders the page and while it hydrates, true afterwards. The organization,
 * class and exam lists start empty and only begin loading once the page runs in the browser, so until
 * then "nothing loaded yet" must show as loading, never as an empty state ("No classes yet").
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}

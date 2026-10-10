/**
 * Move keyboard focus to the start of the page's main content (the skip link's target), e.g. after the
 * control that had focus went away: a drawer link that navigated, or a card that was deleted. Waits a
 * frame so it runs after React has removed the old control.
 */
export function focusMainContent(): void {
    requestAnimationFrame(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
}

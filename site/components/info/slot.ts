import site from "@/content/site";
import type { Slot } from "@/content/types-info";

const unfilled = (value: string) => value.trim().startsWith("TODO");

/** The line a slot shows: its template once the value is filled, else its fallback (or nothing). */
export function slotText(slot: Slot): string | null {
    if (unfilled(slot.value)) return slot.fallback ?? null;
    return slot.template.replace("{value}", slot.value);
}

/** The contact address, or null while site.ts still holds the placeholder. */
export function contactEmail(): string | null {
    return unfilled(site.contactEmail) ? null : site.contactEmail;
}

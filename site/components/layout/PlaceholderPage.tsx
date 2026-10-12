import type { PageContent } from "@/content/types";

/** Minimal page body used until each page is designed. */
export default function PlaceholderPage({ content }: { content: PageContent }) {
    return (
        <article>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
        </article>
    );
}

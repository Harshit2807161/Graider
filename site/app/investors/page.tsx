import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import content from "@/content/investors";

export const metadata: Metadata = { title: content.title, description: content.description };

export default function Page() {
    return <PlaceholderPage content={content} />;
}

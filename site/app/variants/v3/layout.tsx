import { Atkinson_Hyperlegible_Next } from "next/font/google";
import styles from "./layout.module.css";

// The site's own text in v3; the embedded product panels keep Inter (--font-inter, from the root layout)
const site = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-site", display: "swap" });

export default function V3Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <div className={`${site.variable} ${styles.root}`}>{children}</div>;
}

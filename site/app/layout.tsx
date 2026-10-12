import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import site from "@/content/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "fallback" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className={inter.variable}>
        <a href="#main" className="skip-link">
          {site.skipLink}
        </a>
        {/* The header must stay a direct child of <body>: the design variants hide it on their own
            routes with `body:has(...) > header`. */}
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

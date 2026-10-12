import path from "node:path";
import type { NextConfig } from "next";

// The site may first be hosted under a sub-path (e.g. /graider). Empty by default.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

// Product components are imported straight from ../frontend (see tsconfig `@product/*`),
// so the bundler root has to be the repo root, not site/.
const repoRoot = path.join(__dirname, "..");

// Files under ../frontend would otherwise resolve react, clsx and lucide-react from
// frontend/node_modules (a second copy of React breaks hooks, and CI may not have that folder).
const shared = ["react", "react-dom", "clsx", "lucide-react"];
// Turbopack reads alias paths relative to its root, so these are relative, not absolute.
const alias = Object.fromEntries(shared.map((name) => [name, `./site/node_modules/${name}`]));

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  ...(basePath ? { basePath } : {}),
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
    resolveAlias: alias,
  },
};

export default nextConfig;

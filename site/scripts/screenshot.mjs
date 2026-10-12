// Screenshots of site routes at phone, tablet and desktop widths.
// Usage: node scripts/screenshot.mjs <baseUrl> <outDir> <route> [route...]
//   e.g. node scripts/screenshot.mjs http://localhost:3100 ../tmp/shots / /sample/
// For each route it writes <name>-<width>-first.png (first screen) and <name>-<width>-full.png.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [baseUrl, outDir, ...routes] = process.argv.slice(2);
if (!baseUrl || !outDir || routes.length === 0) {
    console.error("usage: node scripts/screenshot.mjs <baseUrl> <outDir> <route> [route...]");
    process.exit(1);
}
const viewports = [
    { name: "390", width: 390, height: 844, mobile: true },
    { name: "820", width: 820, height: 1180, mobile: true },
    { name: "1440", width: 1440, height: 900, mobile: false },
];
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
for (const route of routes) {
    const name = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");
    for (const vp of viewports) {
        const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1,
            isMobile: vp.mobile,
            hasTouch: vp.mobile,
            reducedMotion: "no-preference",
        });
        const page = await context.newPage();
        await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" });
        await page.waitForTimeout(1500); // let the one load animation finish
        await page.screenshot({ path: path.join(outDir, `${name}-${vp.name}-first.png`) });
        // Scroll through once, as a reader would, so marks and highlights that draw on view are drawn
        await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.6)) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
        });
        await page.waitForTimeout(900);
        await page.screenshot({ path: path.join(outDir, `${name}-${vp.name}-full.png`), fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        console.log(`${name} @${vp.name}: ${overflow ? "HORIZONTAL OVERFLOW" : "ok"}`);
        await context.close();
    }
}
await browser.close();

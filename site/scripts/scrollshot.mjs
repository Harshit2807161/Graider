import { chromium } from "playwright";
const [url, out, ...ys] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
for (const y of ys) {
  await page.evaluate((y) => window.scrollTo(0, Number(y)), y);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}-${y}.png` });
}
await browser.close();

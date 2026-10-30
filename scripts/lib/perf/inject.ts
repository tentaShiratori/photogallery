import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright-core";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { PaintMetrics, WebVitalsMetrics } from "./types.ts";

void onCLS;
void onFCP;
void onINP;
void onLCP;
void onTTFB;

const WEB_VITALS_IIFE = readFileSync(
  fileURLToPath(new URL("./web-vitals.iife.js", import.meta.resolve("web-vitals"))),
  "utf8",
);

const BOOTSTRAP = `
window.__pgVitals = { fcp: null, lcp: null, cls: null, ttfb: null, inp: null };
window.__pgPaint = { lcp: null };
webVitals.onFCP((m) => { window.__pgVitals.fcp = m.value; }, { reportAllChanges: true });
webVitals.onLCP((m) => { window.__pgVitals.lcp = m.value; }, { reportAllChanges: true });
webVitals.onCLS((m) => { window.__pgVitals.cls = m.value; }, { reportAllChanges: true });
webVitals.onTTFB((m) => { window.__pgVitals.ttfb = m.value; }, { reportAllChanges: true });
webVitals.onINP((m) => { window.__pgVitals.inp = m.value; }, { reportAllChanges: true });
const po = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  if (last) window.__pgPaint.lcp = last.startTime;
});
po.observe({ type: "largest-contentful-paint", buffered: true });
`;

type VitalsWindow = {
  readonly __pgVitals?: {
    fcp: number | null;
    lcp: number | null;
    cls: number | null;
    ttfb: number | null;
    inp: number | null;
  };
  readonly __pgPaint?: { lcp: number | null };
};

export async function injectCollectors(page: Page): Promise<void> {
  await page.addInitScript({ content: `${WEB_VITALS_IIFE}\n${BOOTSTRAP}` });
}

export async function collectPaintAndVitals(page: Page): Promise<{
  readonly paint: PaintMetrics;
  readonly vitals: WebVitalsMetrics;
}> {
  await page.waitForFunction(() => {
    const boxed = window as unknown as { __pgPaint?: { lcp: number | null } };
    const fcp = performance.getEntriesByType("paint").some((entry) => entry.name === "first-contentful-paint");
    const nav = performance.getEntriesByType("navigation")[0];
    return fcp && nav !== undefined && boxed.__pgPaint?.lcp != null;
  });
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) throw new Error("Navigation Timing がありません。");
    const fcp = performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint");
    if (!fcp) throw new Error("FCP がありません。");
    const boxed = window as unknown as VitalsWindow;
    const lcp = boxed.__pgPaint?.lcp;
    if (lcp === undefined || lcp === null) throw new Error("LCP がありません。");
    const vitals = boxed.__pgVitals ?? { fcp: null, lcp: null, cls: null, ttfb: null, inp: null };
    return {
      paint: { fcpMs: fcp.startTime, lcpMs: lcp, ttfbMs: nav.responseStart },
      vitals: {
        fcpMs: vitals.fcp,
        lcpMs: vitals.lcp,
        cls: vitals.cls,
        ttfbMs: vitals.ttfb,
        inpMs: vitals.inp,
      },
    };
  });
}

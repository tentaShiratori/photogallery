import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { collectPaintAndVitals, injectCollectors } from "./inject.ts";

const originalPerformance = globalThis.performance;
const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.performance = originalPerformance;
  globalThis.window = originalWindow;
});

describe("injectCollectors", () => {
  it("web-vitals の init script を足す", async () => {
    const addInitScript = vi.fn(async (_source: { content: string }) => undefined);
    const page = { addInitScript };
    await injectCollectors(page as never);
    expect(addInitScript).toHaveBeenCalledOnce();
    expect(addInitScript.mock.calls[0]?.[0].content).toContain("webVitals.onFCP");
  });
});

describe("collectPaintAndVitals", () => {
  it("paint と vitals を page から集める", async () => {
    const page = {
      waitForFunction: vi.fn(async () => undefined),
      evaluate: vi.fn(async () => ({
        paint: { fcpMs: 10, lcpMs: 20, ttfbMs: 3 },
        vitals: { fcpMs: 11, lcpMs: 21, cls: 0.1, ttfbMs: 4, inpMs: null },
      })),
    };
    await expect(collectPaintAndVitals(page as never)).resolves.toEqual({
      paint: { fcpMs: 10, lcpMs: 20, ttfbMs: 3 },
      vitals: { fcpMs: 11, lcpMs: 21, cls: 0.1, ttfbMs: 4, inpMs: null },
    });
  });

  it("ページ内の paint と vitals を読む", async () => {
    globalThis.performance = {
      getEntriesByType: (type: string) => {
        if (type === "paint") return [{ name: "first-contentful-paint", startTime: 4 }];
        if (type === "navigation") return [{ responseStart: 5 }];
        return [];
      },
    } as unknown as Performance;
    globalThis.window = {
      __pgPaint: { lcp: 9 },
      __pgVitals: { fcp: 4, lcp: 9, cls: 0.01, ttfb: 5, inp: 6 },
    } as unknown as Window & typeof globalThis;
    const page = {
      waitForFunction: async (fn: () => boolean) => {
        expect(fn()).toBe(true);
      },
      evaluate: async (fn: () => unknown) => fn(),
    };
    await expect(collectPaintAndVitals(page as never)).resolves.toEqual({
      paint: { fcpMs: 4, lcpMs: 9, ttfbMs: 5 },
      vitals: { fcpMs: 4, lcpMs: 9, cls: 0.01, ttfbMs: 5, inpMs: 6 },
    });
  });

  it("Navigation・FCP・LCP が無いと失敗する", async () => {
    const page = {
      waitForFunction: async () => undefined,
      evaluate: async (fn: () => unknown) => fn(),
    };
    globalThis.performance = { getEntriesByType: () => [] } as unknown as Performance;
    globalThis.window = {} as unknown as Window & typeof globalThis;
    await expect(collectPaintAndVitals(page as never)).rejects.toThrow("Navigation Timing がありません。");

    globalThis.performance = {
      getEntriesByType: (type: string) => (type === "navigation" ? [{ responseStart: 1 }] : []),
    } as unknown as Performance;
    await expect(collectPaintAndVitals(page as never)).rejects.toThrow("FCP がありません。");

    globalThis.performance = {
      getEntriesByType: (type: string) => {
        if (type === "navigation") return [{ responseStart: 1 }];
        if (type === "paint") return [{ name: "first-contentful-paint", startTime: 2 }];
        return [];
      },
    } as unknown as Performance;
    await expect(collectPaintAndVitals(page as never)).rejects.toThrow("LCP がありません。");
  });
});

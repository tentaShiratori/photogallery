import { describe, expect, it, vi } from "vite-plus/test";
import { collectPaintAndVitals, injectCollectors } from "./inject.ts";

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
});

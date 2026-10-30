import type { Page } from "playwright-core";
import { describe, expect, it } from "vite-plus/test";
import { measureEnlarged, measureYearList, measureYearScreen } from "./scenarios.ts";
import type { PlaywrightSample, ServerTiming } from "./types.ts";

const server: ServerTiming = { r2Calls: 2, r2Ms: 3, totalMs: 4 };
const paint = { fcpMs: 1, lcpMs: 2, ttfbMs: 3 };
const vitals = { fcpMs: 1, lcpMs: 2, cls: 0, ttfbMs: 3, inpMs: null };

function steps(marks: Readonly<Record<string, number>>) {
  const calls: string[] = [];
  const sample = (): PlaywrightSample => ({ marks, paint, vitals, server });
  return {
    calls,
    deps: {
      preparePage: async () => {
        calls.push("prepare");
      },
      openForMeasure: async (_page: Page, url: string) => {
        calls.push(`open:${url}`);
      },
      collectMarks: async (_page: Page, names: readonly string[]) => {
        calls.push(`marks:${names.join(",")}`);
        return marks;
      },
      collectPaintAndVitals: async () => {
        calls.push("paint");
        return { paint, vitals };
      },
      attachServerTimingListener: (_page: Page, wantYear: boolean) => {
        calls.push(`timing:${wantYear}`);
        return { take: () => server };
      },
      sleep: async (ms: number) => {
        calls.push(`sleep:${ms}`);
      },
    },
    sample,
  };
}

const page = {
  locator: (selector: string) => ({
    first: () => ({
      click: async () => {
        clicked.push(selector);
      },
    }),
  }),
} as unknown as Page;

const clicked: string[] = [];

describe("measure scenarios", () => {
  it("年の一覧は year なしの Server-Timing", async () => {
    const harness = steps({ "year-list-ready": 10 });
    const result = await measureYearList(page, "http://localhost:8787/", harness.deps);
    expect(result.server).toEqual(server);
    expect(result.marks["year-list-ready"]).toBe(10);
    expect(harness.calls).toEqual([
      "prepare",
      "timing:false",
      "open:http://localhost:8787/",
      "marks:year-list-loading,year-list-api,year-list-ready",
      "paint",
    ]);
  });

  it("年の画面は year 付き URL", async () => {
    const harness = steps({ "year-screen-ready": 11 });
    await measureYearScreen(page, "http://localhost:8787/", "2024", harness.deps);
    expect(harness.calls).toContain("timing:true");
    expect(harness.calls).toContain("open:http://localhost:8787/?year=2024");
    expect(harness.calls).toContain("marks:year-screen-loading,year-screen-api,year-screen-ready");
  });

  it("拡大表示はタイルを押して 300ms 待つ", async () => {
    clicked.length = 0;
    const harness = steps({ "enlarged-ready": 12 });
    const result = await measureEnlarged(page, "http://localhost:8787", "unknown", harness.deps);
    expect(clicked).toEqual(['#grid button[data-kind="image"]']);
    expect(harness.calls).toContain("marks:year-screen-loading,year-screen-api,year-screen-ready");
    expect(harness.calls).toContain("marks:enlarged-open,enlarged-ready");
    expect(harness.calls).toContain("sleep:300");
    expect(harness.calls).toContain("open:http://localhost:8787/?year=unknown");
    expect(result.marks["enlarged-ready"]).toBe(12);
  });
});

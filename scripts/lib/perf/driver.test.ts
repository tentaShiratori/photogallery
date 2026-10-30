import { describe, expect, it, vi } from "vite-plus/test";
import { MEASURE_RUNS, WARMUP_RUNS } from "./constants.ts";
import { runScenarios } from "./driver.ts";
import type { PlaywrightSample } from "./types.ts";

const sample: PlaywrightSample = {
  marks: { "year-list-ready": 12 },
  paint: { fcpMs: 1, lcpMs: 2, ttfbMs: 3 },
  vitals: { fcpMs: 1, lcpMs: 2, cls: 0, ttfbMs: 3, inpMs: null },
  server: { r2Calls: 1, r2Ms: 4, totalMs: 5 },
};

describe("runScenarios", () => {
  it("年の一覧を測り Lighthouse も回す", async () => {
    const pages: unknown[] = [];
    const context = {
      newPage: async () => {
        const page = {
          close: vi.fn(async () => undefined),
        };
        pages.push(page);
        return page;
      },
      cookies: async () => [{ name: "CF_Authorization", value: "t", domain: "example.test" }],
      close: vi.fn(async () => undefined),
    };
    const printed: unknown[][] = [];
    await runScenarios(context as never, "https://example.test/", true, ["year-list"], null, {
      measureYearList: async () => sample,
      runLighthouse: async (url, cookies) => {
        expect(url).toBe("https://example.test/");
        expect(cookies).toHaveLength(1);
        return [{ score: 1, fcpMs: 1, lcpMs: 1, tbtMs: 1, cls: 0, speedIndexMs: 1, opportunities: [] }];
      },
      printHeader: (...args) => printed.push(["header", ...args]),
      printScenario: (...args) => printed.push(["scenario", ...args]),
      error: () => undefined,
      log: () => undefined,
    });
    expect(pages).toHaveLength(WARMUP_RUNS + MEASURE_RUNS);
    expect(context.close).toHaveBeenCalled();
    expect(printed.map((row) => row[0])).toEqual(["header", "scenario"]);
  });

  it("拡大表示は Lighthouse を回さず対象年を出す", async () => {
    const logs: string[] = [];
    const lighthouseUrls: Array<string | null> = [];
    const printed: unknown[] = [];
    const context = {
      newPage: async () => ({ close: async () => undefined }),
      cookies: async () => [],
      close: async () => undefined,
    };
    await runScenarios(context as never, "https://example.test/", false, ["enlarged"], "2024", {
      resolveYearToken: async () => "2024",
      measureEnlarged: async () => sample,
      runLighthouse: async (url) => {
        lighthouseUrls.push(url);
        return [];
      },
      printHeader: () => undefined,
      printScenario: (_name, _samples, lighthouse) => {
        printed.push(lighthouse);
      },
      error: () => undefined,
      log: (message) => logs.push(message),
    });
    expect(lighthouseUrls).toEqual([]);
    expect(printed).toEqual([null]);
    expect(logs[0]).toBe("対象年: 2024");
  });

  it("対象年が null なら year-screen を測らない", async () => {
    const context = {
      newPage: async () => ({ close: async () => undefined }),
      cookies: async () => [],
      close: async () => undefined,
    };
    await expect(
      runScenarios(context as never, "https://example.test/", true, ["year-screen"], null, {
        resolveYearToken: async () => null as unknown as string,
        error: () => undefined,
      }),
    ).rejects.toThrow("対象年がありません。");
  });

  it("年が無い year-screen は失敗する", async () => {
    const context = {
      newPage: async () => ({ close: async () => undefined }),
      cookies: async () => [],
      close: async () => undefined,
    };
    await expect(
      runScenarios(context as never, "https://example.test/", true, ["year-screen"], null, {
        resolveYearToken: async () => {
          throw new Error("対象年がありません。");
        },
        error: () => undefined,
      }),
    ).rejects.toThrow("対象年がありません。");
  });
});

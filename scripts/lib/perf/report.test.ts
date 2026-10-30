import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { printHeader, printScenario } from "./report.ts";
import type { LighthouseSample, PlaywrightSample } from "./types.ts";

function sample(partial: Partial<PlaywrightSample> = {}): PlaywrightSample {
  return {
    marks: {
      "year-list-loading": 10,
      "year-list-api": 20,
      "year-list-ready": 30,
      ...partial.marks,
    },
    paint: { fcpMs: 40, lcpMs: 50, ttfbMs: 5, ...partial.paint },
    vitals: { fcpMs: 41, lcpMs: 51, cls: 0.01, ttfbMs: 6, inpMs: null, ...partial.vitals },
    server: { r2Calls: 2, r2Ms: 12, totalMs: 18, ...partial.server },
  };
}

const lighthouse: LighthouseSample = {
  score: 90,
  fcpMs: 100,
  lcpMs: 200,
  tbtMs: 10,
  cls: 0.02,
  speedIndexMs: 300,
  opportunities: ["Reduce unused JS: 40 ms"],
};

describe("printHeader / printScenario", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ヘッダに日時・URL・コミットを出す", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    });
    printHeader("https://example.test/", true, {
      stamp: () => "2026-01-02 03:04:05 JST",
      commit: () => "abc1234",
    });
    expect(lines.join("\n")).toContain("日時: 2026-01-02 03:04:05 JST");
    expect(lines.join("\n")).toContain("URL: https://example.test/ (local)");
    expect(lines.join("\n")).toContain("コミット: abc1234");
  });

  it("年の一覧シナリオを出し、拡大表示では INP を出す", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    });
    printScenario("year-list", [sample(), sample({ paint: { fcpMs: Number.NaN, lcpMs: 1, ttfbMs: 1 } })], [lighthouse]);

    expect(lines.some((line) => line.includes("## 年の一覧"))).toBe(true);
    expect(lines.some((line) => line.includes("Performance スコア"))).toBe(true);
    expect(lines.some((line) => line.includes("Reduce unused JS"))).toBe(true);

    lines.length = 0;
    printScenario(
      "enlarged",
      [
        sample({
          marks: { "enlarged-open": 1, "enlarged-ready": 2 },
          vitals: { fcpMs: 1, lcpMs: 2, cls: 0, ttfbMs: 3, inpMs: 9 },
        }),
      ],
      null,
    );
    expect(lines.some((line) => line.includes("## 拡大表示"))).toBe(true);
    expect(lines.some((line) => line.includes("対象外（拡大表示に URL がない）"))).toBe(true);
    expect(lines.some((line) => line.includes("INP"))).toBe(true);
  });

  it("値なしと指摘なしの分岐を出す", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    });
    printScenario(
      "year-screen",

      [
        sample({
          marks: {},
          paint: { fcpMs: Number.NaN, lcpMs: Number.NaN, ttfbMs: Number.NaN },
          vitals: { fcpMs: null, lcpMs: null, cls: null, ttfbMs: null, inpMs: null },
        }),
      ],
      [{ ...lighthouse, opportunities: [] }],
    );

    expect(lines.some((line) => line.includes("（値なし）"))).toBe(true);
    expect(lines.some((line) => line.includes("（なし）"))).toBe(true);
  });
});

import { desktopConfig } from "lighthouse";
import { describe, expect, it } from "vite-plus/test";
import { LH_MEASURE_RUNS, LH_WARMUP_RUNS } from "./constants.ts";
import { runLighthouse, type LighthouseDeps } from "./lighthouse.ts";

type Audit = {
  numericValue?: number;
  title?: string;
  details?: { type?: string };
};

function lhr(overrides?: { score?: number | null; missing?: string }) {
  const audits: Record<string, Audit | undefined> = {
    "first-contentful-paint": { numericValue: 100 },
    "largest-contentful-paint": { numericValue: 200 },
    "total-blocking-time": { numericValue: 10 },
    "cumulative-layout-shift": { numericValue: 0.02 },
    "speed-index": { numericValue: 150 },
    big: { title: "大きい", numericValue: 40, details: { type: "opportunity" } },
    mid: { title: "中", numericValue: 20, details: { type: "opportunity" } },
    small: { title: "小", numericValue: 5, details: { type: "opportunity" } },
    tiny: { title: "極小", numericValue: 1, details: { type: "opportunity" } },
    zero: { title: "ゼロ", numericValue: 0, details: { type: "opportunity" } },
    other: { title: "診断", numericValue: 99, details: { type: "table" } },
  };
  if (overrides?.missing) audits[overrides.missing] = { numericValue: Number.NaN };
  const score = overrides && "score" in overrides ? overrides.score : 0.9;
  return { categories: { performance: { score } }, audits };
}

function harness(result: { lhr?: ReturnType<typeof lhr> } | undefined) {
  const headers: Array<Readonly<Record<string, string>> | undefined> = [];
  const configs: unknown[] = [];
  const ports: number[] = [];
  let kills = 0;
  const deps = {
    chromePath: () => "/opt/chrome",
    error: () => undefined,
    launch: async () => {
      const port = 9222 + ports.length;
      ports.push(port);
      return {
        port,
        kill: () => {
          kills += 1;
        },
      };
    },
    lighthouse: async (_url: string, flags?: { extraHeaders?: Readonly<Record<string, string>> }, config?: unknown) => {
      headers.push(flags?.extraHeaders);
      configs.push(config);
      return result;
    },
  } as unknown as LighthouseDeps;
  return {
    deps,
    headers,
    configs,
    ports,
    killed: () => kills,
  };
}

describe("runLighthouse", () => {
  it("暖機を除いた計測と Cookie と指摘の上位 3 件", async () => {
    const run = harness({ lhr: lhr() });
    const samples = await runLighthouse(
      "https://gallery.example/path",
      [
        { name: "CF_Authorization", value: "tok", domain: ".gallery.example" },
        { name: "other", value: "no", domain: "elsewhere.test" },
        { name: "host", value: "yes", domain: "gallery.example" },
      ],
      run.deps,
    );
    expect(samples).toHaveLength(LH_MEASURE_RUNS);
    expect(run.ports).toHaveLength(LH_WARMUP_RUNS + LH_MEASURE_RUNS);
    expect(run.killed()).toBe(LH_WARMUP_RUNS + LH_MEASURE_RUNS);
    expect(run.configs[0]).toBe(desktopConfig);
    expect(samples[0]).toMatchObject({ score: 90, fcpMs: 100, lcpMs: 200, tbtMs: 10, cls: 0.02, speedIndexMs: 150 });
    expect(samples[0]?.opportunities).toEqual(["大きい: 40 ms", "中: 20 ms", "小: 5 ms"]);
    expect(run.headers[0]).toEqual({ Cookie: "CF_Authorization=tok; host=yes" });
  });

  it("Cookie が無ければヘッダを付けない", async () => {
    const run = harness({ lhr: lhr() });
    await runLighthouse("https://gallery.example/", [], run.deps);
    expect(run.headers[0]).toBeUndefined();
  });

  it("結果・スコア・数値が無ければ Chrome を止めて失敗する", async () => {
    const missing = harness(undefined);
    await expect(runLighthouse("https://gallery.example/", [], missing.deps)).rejects.toThrow(
      "Lighthouse が結果を返しませんでした。",
    );
    expect(missing.killed()).toBe(1);

    const score = harness({ lhr: lhr({ score: null }) });
    await expect(runLighthouse("https://gallery.example/", [], score.deps)).rejects.toThrow(
      "Lighthouse の Performance スコアがありません。",
    );

    const numeric = harness({ lhr: lhr({ missing: "speed-index" }) });
    await expect(runLighthouse("https://gallery.example/", [], numeric.deps)).rejects.toThrow(
      "Lighthouse の speed-index がありません。",
    );
  });
});

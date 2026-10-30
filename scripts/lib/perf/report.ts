import { gitCommit, jstStamp } from "./cli.ts";
import { LH_MEASURE_RUNS, LH_WARMUP_RUNS, MEASURE_RUNS, WARMUP_RUNS } from "./constants.ts";
import type { LighthouseSample, PlaywrightSample, ScenarioName } from "./types.ts";

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  const weight = rank - low;
  return sorted[low]! * (1 - weight) + sorted[high]! * weight;
}

function summarize(values: readonly number[]): { median: number; p90: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    max: sorted[sorted.length - 1]!,
  };
}

function printSection(title: string, values: readonly number[], unit: string): void {
  const present = values.filter((value) => Number.isFinite(value));
  if (present.length === 0) {
    console.log(title);
    console.log("  （値なし）");
    return;
  }
  const stats = summarize(present);
  const digits = unit === "" ? 3 : 1;
  console.log(title);
  console.log(`  回ごと: ${present.map((value) => value.toFixed(digits)).join(", ")}`);
  console.log(
    `  中央値: ${stats.median.toFixed(digits)} ${unit}  p90: ${stats.p90.toFixed(digits)} ${unit}  最大: ${stats.max.toFixed(digits)} ${unit}`.trimEnd(),
  );
}

function markValues(samples: readonly PlaywrightSample[], name: string): number[] {
  return samples.map((sample) => sample.marks[name]).filter((value): value is number => value !== undefined);
}

function printPlaywright(
  samples: readonly PlaywrightSample[],
  markOrder: readonly { name: string; title: string }[],
): void {
  console.log("Playwright（実機・スロットルなし）");
  for (const mark of markOrder) {
    printSection(mark.title, markValues(samples, mark.name), "ms");
  }
  printSection(
    "ページの FCP",
    samples.map((s) => s.paint.fcpMs),
    "ms",
  );
  printSection(
    "ページの LCP",
    samples.map((s) => s.paint.lcpMs),
    "ms",
  );
  printSection(
    "ページの TTFB",
    samples.map((s) => s.paint.ttfbMs),
    "ms",
  );
  printSection(
    "Server-Timing r2 回数",
    samples.map((s) => s.server.r2Calls),
    "",
  );
  printSection(
    "Server-Timing r2 時間",
    samples.map((s) => s.server.r2Ms),
    "ms",
  );
  printSection(
    "Server-Timing total 時間",
    samples.map((s) => s.server.totalMs),
    "ms",
  );
}

function printVitals(samples: readonly PlaywrightSample[], includeInp: boolean): void {
  console.log("web-vitals（同じ Playwright の回）");
  printSection(
    "FCP",
    samples.map((s) => s.vitals.fcpMs ?? Number.NaN),
    "ms",
  );
  printSection(
    "LCP",
    samples.map((s) => s.vitals.lcpMs ?? Number.NaN),
    "ms",
  );
  printSection(
    "CLS",
    samples.map((s) => s.vitals.cls ?? Number.NaN),
    "",
  );
  printSection(
    "TTFB",
    samples.map((s) => s.vitals.ttfbMs ?? Number.NaN),
    "ms",
  );
  if (includeInp) {
    printSection(
      "INP",
      samples.map((s) => s.vitals.inpMs ?? Number.NaN),
      "ms",
    );
  } else {
    console.log("INP");
    console.log("  操作なし");
  }
}

function printLighthouse(samples: readonly LighthouseSample[] | null): void {
  console.log("Lighthouse（デスクトップラボ。Playwright とはスロットルが違う）");
  if (samples === null) {
    console.log("  対象外（拡大表示に URL がない）");
    return;
  }
  printSection(
    "Performance スコア",
    samples.map((s) => s.score),
    "",
  );
  printSection(
    "FCP",
    samples.map((s) => s.fcpMs),
    "ms",
  );
  printSection(
    "LCP",
    samples.map((s) => s.lcpMs),
    "ms",
  );
  printSection(
    "TBT",
    samples.map((s) => s.tbtMs),
    "ms",
  );
  printSection(
    "CLS",
    samples.map((s) => s.cls),
    "",
  );
  printSection(
    "Speed Index",
    samples.map((s) => s.speedIndexMs),
    "ms",
  );
  console.log("指摘の上位");
  const last = samples[samples.length - 1];
  if (last === undefined || last.opportunities.length === 0) {
    console.log("  （なし）");
    return;
  }
  for (const line of last.opportunities) {
    console.log(`  ${line}`);
  }
}

const MARKS: Record<ScenarioName, readonly { name: string; title: string }[]> = {
  "year-list": [
    { name: "year-list-loading", title: "1. 「読み込み中です」まで (year-list-loading)" },
    { name: "year-list-api", title: "2. /api/media の返事まで (year-list-api)" },
    { name: "year-list-ready", title: "3. 年の一覧とサムネイル完了まで (year-list-ready)" },
  ],
  "year-screen": [
    { name: "year-screen-loading", title: "1. 「読み込み中です」まで (year-screen-loading)" },
    { name: "year-screen-api", title: "2. /api/media?year= の返事まで (year-screen-api)" },
    { name: "year-screen-ready", title: "3. 最初のタイルのサムネイル完了まで (year-screen-ready)" },
  ],
  enlarged: [
    { name: "enlarged-open", title: "1. タイルを選ぶまで (enlarged-open)" },
    { name: "enlarged-ready", title: "2. 本体が見えるまで (enlarged-ready)" },
  ],
};

const TITLES: Record<ScenarioName, string> = {
  "year-list": "年の一覧",
  "year-screen": "年の画面",
  enlarged: "拡大表示",
};

export function printHeader(
  url: string,
  local: boolean,
  deps: { stamp?: () => string; commit?: () => string } = {},
): void {
  const stamp = deps.stamp ?? jstStamp;
  const commit = deps.commit ?? gitCommit;
  console.log(`日時: ${stamp()}`);
  console.log(`URL: ${url}${local ? " (local)" : ""}`);
  console.log(`コミット: ${commit()}`);
  console.log(
    `回数: Playwright 暖機 ${WARMUP_RUNS} + 計測 ${MEASURE_RUNS} / Lighthouse 暖機 ${LH_WARMUP_RUNS} + 計測 ${LH_MEASURE_RUNS}`,
  );
  console.log("");
}

export function printScenario(
  name: ScenarioName,
  samples: readonly PlaywrightSample[],
  lighthouseSamples: readonly LighthouseSample[] | null,
): void {
  console.log(`## ${TITLES[name]}`);
  console.log("");
  printPlaywright(samples, MARKS[name]);
  console.log("");
  printVitals(samples, name === "enlarged");
  console.log("");
  printLighthouse(lighthouseSamples);
  console.log("");
}

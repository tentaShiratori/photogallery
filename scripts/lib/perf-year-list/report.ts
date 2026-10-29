import type { BrowserContext } from "playwright-core";
import { gitCommit, jstStamp } from "./cli.ts";
import { oneRun, type RunSample } from "./run.ts";

const WARMUP_RUNS = 1;
const MEASURE_RUNS = 10;

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

function printMsSection(title: string, values: readonly number[]): void {
  const stats = summarize(values);
  console.log(title);
  console.log(`  回ごと: ${values.map((value) => value.toFixed(1)).join(", ")}`);
  console.log(
    `  中央値: ${stats.median.toFixed(1)} ms  p90: ${stats.p90.toFixed(1)} ms  最大: ${stats.max.toFixed(1)} ms`,
  );
}

function printCountSection(title: string, values: readonly number[]): void {
  const stats = summarize(values);
  console.log(title);
  console.log(`  回ごと: ${values.map((value) => String(value)).join(", ")}`);
  console.log(`  中央値: ${stats.median.toFixed(1)}  p90: ${stats.p90.toFixed(1)}  最大: ${stats.max.toFixed(1)}`);
}

export async function runBenchmark(context: BrowserContext, url: string, local: boolean): Promise<void> {
  console.error(`暖機 ${WARMUP_RUNS} 回のあと、計測 ${MEASURE_RUNS} 回… (${url})`);
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await oneRun(context, url);
  }

  const samples: RunSample[] = [];
  for (let i = 0; i < MEASURE_RUNS; i++) {
    const sample = await oneRun(context, url);
    samples.push(sample);
    console.error(
      `  #${i + 1}/${MEASURE_RUNS} loading=${sample.client.loadingMs.toFixed(0)} api=${sample.client.apiMs.toFixed(0)} ready=${sample.client.readyMs.toFixed(0)} r2=${sample.server.r2Calls}/${sample.server.r2Ms.toFixed(0)}ms total=${sample.server.totalMs.toFixed(0)}ms`,
    );
  }

  console.log(`日時: ${jstStamp()}`);
  console.log(`URL: ${url}${local ? " (local)" : ""}`);
  console.log(`コミット: ${gitCommit()}`);
  console.log(`回数: 暖機 ${WARMUP_RUNS} + 計測 ${MEASURE_RUNS}`);
  console.log("");
  printMsSection(
    "1. 「読み込み中です」まで (year-list-loading)",
    samples.map((s) => s.client.loadingMs),
  );
  printMsSection(
    "2. /api/media の返事まで (year-list-api)",
    samples.map((s) => s.client.apiMs),
  );
  printMsSection(
    "3. 年の一覧とサムネイル完了まで (year-list-ready)",
    samples.map((s) => s.client.readyMs),
  );
  console.log("");
  printCountSection(
    "Server-Timing r2 回数",
    samples.map((s) => s.server.r2Calls),
  );
  printMsSection(
    "Server-Timing r2 時間",
    samples.map((s) => s.server.r2Ms),
  );
  printMsSection(
    "Server-Timing total 時間",
    samples.map((s) => s.server.totalMs),
  );
}

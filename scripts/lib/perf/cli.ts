import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { perfYearListEnv } from "../env.ts";
import { DEFAULT_PRODUCTION_URL, LOCAL_URL } from "./constants.ts";
import type { ScenarioName } from "./types.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SCENARIOS: readonly ScenarioName[] = ["year-list", "year-screen", "enlarged"];

function usage(): never {
  console.error(`使い方:
  pnpm perf                              本番を 3 シナリオ測る（PHOTOGALLERY_URL で上書き可）
  pnpm perf -- --local                   ローカル http://localhost:8787 を測る
  pnpm perf -- --scenario year-list      年の一覧だけ
  pnpm perf -- --scenario year-screen    年の画面だけ
  pnpm perf -- --scenario enlarged       拡大表示だけ
  pnpm perf -- --year 2024               年の画面と拡大表示の対象年
  pnpm perf:year-list                    年の一覧の別名
`);
  process.exit(2);
}

function isScenario(value: string): value is ScenarioName {
  return (SCENARIOS as readonly string[]).includes(value);
}

export type ParsedArgs = {
  readonly local: boolean;
  readonly url: string;
  readonly scenarios: readonly ScenarioName[];
  readonly year: string | null;
};

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let local = false;
  let year: string | null = null;
  const selected: ScenarioName[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--") continue;
    if (arg === "--local") {
      local = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") usage();
    if (arg === "--scenario") {
      const value = argv[++i];
      if (value === undefined || !isScenario(value)) usage();
      selected.push(value);
      continue;
    }
    if (arg.startsWith("--scenario=")) {
      const value = arg.slice("--scenario=".length);
      if (!isScenario(value)) usage();
      selected.push(value);
      continue;
    }
    if (arg === "--year") {
      year = argv[++i] ?? null;
      if (year === null || year.length === 0) usage();
      continue;
    }
    if (arg.startsWith("--year=")) {
      year = arg.slice("--year=".length);
      if (year.length === 0) usage();
      continue;
    }
    console.error(`不明な引数: ${arg}`);
    usage();
  }
  if (year !== null && year !== "unknown" && !/^[1-9]\d{0,3}$/.test(year)) {
    console.error(`不正な --year: ${year}`);
    usage();
  }
  const url = local ? LOCAL_URL : (perfYearListEnv().PHOTOGALLERY_URL ?? DEFAULT_PRODUCTION_URL);
  return {
    local,
    url,
    scenarios: selected.length === 0 ? SCENARIOS : selected,
    year,
  };
}

export function gitCommit(): string {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  if (result.status !== 0) return "(unknown)";
  return result.stdout.trim() || "(unknown)";
}

export function jstStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")} JST`;
}

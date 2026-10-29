import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_URL = "http://localhost:8787";
export const PROFILE_DIR = path.join(homedir(), ".photogallery-perf");

/** Fallback when PHOTOGALLERY_URL is unset. Override with the env var. */
const DEFAULT_PRODUCTION_URL = "https://photogallery.tentashiratori.workers.dev";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function usage(): never {
  console.error(`使い方:
  pnpm perf:year-list              本番を測る（PHOTOGALLERY_URL で上書き可）
  pnpm perf:year-list -- --local   ローカル http://localhost:8787 を測る
`);
  process.exit(2);
}

export function parseArgs(argv: readonly string[]): {
  readonly local: boolean;
  readonly url: string;
} {
  let local = false;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--local") {
      local = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") usage();
    console.error(`不明な引数: ${arg}`);
    usage();
  }
  if (local) return { local: true, url: LOCAL_URL };
  return { local: false, url: photogalleryUrlFromEnv() ?? DEFAULT_PRODUCTION_URL };
}

/** Trimmed non-empty `PHOTOGALLERY_URL`, or null when unset / blank. */
function photogalleryUrlFromEnv(): string | null {
  const value = process.env.PHOTOGALLERY_URL?.trim();
  return value && value.length > 0 ? value : null;
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

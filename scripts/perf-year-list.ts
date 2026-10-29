/**
 * Measures year-list load times in a real Chrome profile.
 *
 * Default target is production (Cloudflare Access). Use `--local` for
 * http://localhost:8787. Override the production URL with PHOTOGALLERY_URL.
 *
 * First production run opens a headed window so you can sign in once; later
 * runs reuse ~/.photogallery-perf headless.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page, type Response } from "playwright-core";

const WARMUP_RUNS = 1;
const MEASURE_RUNS = 10;
const LOCAL_URL = "http://localhost:8787";
const PROFILE_DIR = path.join(homedir(), ".photogallery-perf");
const READY_MARKER = path.join(PROFILE_DIR, ".access-ready");
const MARK_LOADING = "year-list-loading";
const MARK_API = "year-list-api";
const MARK_READY = "year-list-ready";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Fallback when PHOTOGALLERY_URL is unset. Override with the env var. */
const DEFAULT_PRODUCTION_URL = "https://photogallery.tentashiratori.workers.dev";

type ClientMarks = {
  readonly loadingMs: number;
  readonly apiMs: number;
  readonly readyMs: number;
};

type ServerTiming = {
  readonly r2Calls: number;
  readonly r2Ms: number;
  readonly totalMs: number;
};

type RunSample = {
  readonly client: ClientMarks;
  readonly server: ServerTiming;
};

function usage(): never {
  console.error(`使い方:
  pnpm perf:year-list              本番を測る（PHOTOGALLERY_URL で上書き可）
  pnpm perf:year-list -- --local   ローカル http://localhost:8787 を測る
`);
  process.exit(2);
}

function parseArgs(argv: readonly string[]): { readonly local: boolean; readonly url: string } {
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
  const fromEnv = process.env.PHOTOGALLERY_URL?.trim();
  return { local: false, url: fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_PRODUCTION_URL };
}

function gitCommit(): string {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  if (result.status !== 0) return "(unknown)";
  return result.stdout.trim() || "(unknown)";
}

function jstStamp(date = new Date()): string {
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
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")} JST`;
}

function chromeLaunchOptions(): { readonly channel?: "chrome"; readonly executablePath?: string } {
  const candidates = [
    process.env.PHOTOGALLERY_CHROME,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return { executablePath: candidate };
  }
  return { channel: "chrome" };
}

function isAccessUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
  } catch {
    return false;
  }
}

function parseServerTiming(header: string | null): ServerTiming | null {
  if (header === null || header.trim() === "") return null;
  let r2Calls: number | null = null;
  let r2Ms: number | null = null;
  let totalMs: number | null = null;
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const [nameToken, ...paramTokens] = trimmed.split(";").map((token) => token.trim());
    const name = nameToken.toLowerCase();
    let dur: number | null = null;
    let desc: string | null = null;
    for (const param of paramTokens) {
      const eq = param.indexOf("=");
      if (eq < 0) continue;
      const key = param.slice(0, eq).trim().toLowerCase();
      let value = param.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (key === "dur") dur = Number(value);
      if (key === "desc") desc = value;
    }
    if (name === "r2") {
      if (dur !== null && Number.isFinite(dur)) r2Ms = dur;
      if (desc !== null && /^\d+$/.test(desc)) r2Calls = Number(desc);
    }
    if (name === "total" && dur !== null && Number.isFinite(dur)) totalMs = dur;
  }
  if (r2Calls === null || r2Ms === null || totalMs === null) return null;
  return { r2Calls, r2Ms, totalMs };
}

async function waitForGalleryShell(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const titleOk = document.title.includes("フォトギャラリー");
      const host = location.hostname;
      const access = host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
      return titleOk && !access;
    },
    { timeout: 10 * 60 * 1000 },
  );
}

async function ensureAccess(context: BrowserContext, url: string, headed: boolean): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (isAccessUrl(page.url())) {
      if (!headed) {
        throw new Error(
          "Cloudflare Access のログインが必要です。画面ありで一度 `pnpm perf:year-list` を実行し、ログインしてください。",
        );
      }
      console.error("Cloudflare Access にログインしてください。完了すると計測に進みます…");
      await waitForGalleryShell(page);
    } else {
      await waitForGalleryShell(page);
    }
    mkdirSync(PROFILE_DIR, { recursive: true });
    writeFileSync(READY_MARKER, `${new Date().toISOString()}\n`);
  } finally {
    await page.close();
  }
}

async function clearCache(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.clearBrowserCache");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
}

async function collectMarks(page: Page): Promise<ClientMarks> {
  await page.waitForFunction(
    (names: readonly string[]) =>
      names.every((name) => performance.getEntriesByName(name).length > 0),
    [MARK_LOADING, MARK_API, MARK_READY],
    { timeout: 120_000 },
  );
  return page.evaluate(
    (names) => {
      const read = (name: string) => {
        const entry = performance.getEntriesByName(name)[0];
        if (!entry) throw new Error(`missing mark: ${name}`);
        return entry.startTime;
      };
      return {
        loadingMs: read(names.loading),
        apiMs: read(names.api),
        readyMs: read(names.ready),
      };
    },
    { loading: MARK_LOADING, api: MARK_API, ready: MARK_READY },
  );
}

function attachServerTimingListener(page: Page): { readonly take: () => ServerTiming } {
  let latest: ServerTiming | null = null;
  const onResponse = (response: Response) => {
    try {
      const requestUrl = new URL(response.url());
      if (!requestUrl.pathname.endsWith("/api/media")) return;
      if (requestUrl.searchParams.has("year")) return;
      const timing = parseServerTiming(response.headers()["server-timing"] ?? null);
      if (timing) latest = timing;
    } catch {
      // ignore unrelated responses
    }
  };
  page.on("response", onResponse);
  return {
    take: () => {
      page.off("response", onResponse);
      if (latest === null) {
        throw new Error("Server-Timing を /api/media（year なし）から取れませんでした。");
      }
      return latest;
    },
  };
}

async function oneRun(context: BrowserContext, url: string): Promise<RunSample> {
  const page = await context.newPage();
  try {
    await clearCache(page);
    const timing = attachServerTimingListener(page);
    await page.goto(url, { waitUntil: "commit", timeout: 120_000 });
    if (isAccessUrl(page.url())) {
      throw new Error(
        "Access に戻りました。プロフィールのログインが切れているので、画面ありでもう一度実行してください。",
      );
    }
    const client = await collectMarks(page);
    const server = timing.take();
    return { client, server };
  } finally {
    await page.close();
  }
}

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
  console.log(
    `  中央値: ${stats.median.toFixed(1)}  p90: ${stats.p90.toFixed(1)}  最大: ${stats.max.toFixed(1)}`,
  );
}

async function openContext(headless: boolean): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    ...chromeLaunchOptions(),
    viewport: { width: 1280, height: 900 },
    args: ["--disable-dev-shm-usage"],
  });
}

async function runBenchmark(context: BrowserContext, url: string, local: boolean): Promise<void> {
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

async function main(): Promise<void> {
  const { local, url } = parseArgs(process.argv.slice(2));
  mkdirSync(PROFILE_DIR, { recursive: true });

  const accessReady = existsSync(READY_MARKER);
  const needHeadedLogin = !local && !accessReady;

  if (needHeadedLogin) {
    console.error(`初回ログイン: 計測専用プロフィールでブラウザを開きます (${PROFILE_DIR})`);
    const headed = await openContext(false);
    try {
      await ensureAccess(headed, url, true);
    } finally {
      await headed.close();
    }
  }

  const context = await openContext(true);
  try {
    if (!local) {
      await ensureAccess(context, url, false);
    }
    await runBenchmark(context, url, local);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

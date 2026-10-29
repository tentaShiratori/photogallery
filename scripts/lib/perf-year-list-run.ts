import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page, type Response } from "playwright-core";
import { PROFILE_DIR } from "./perf-year-list-cli.ts";

export const READY_MARKER = path.join(PROFILE_DIR, ".access-ready");

const MARK_LOADING = "year-list-loading";
const MARK_API = "year-list-api";
const MARK_READY = "year-list-ready";

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

export type RunSample = {
  readonly client: ClientMarks;
  readonly server: ServerTiming;
};

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

export async function ensureAccess(
  context: BrowserContext,
  url: string,
  headed: boolean,
): Promise<void> {
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

export async function oneRun(context: BrowserContext, url: string): Promise<RunSample> {
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

export async function openContext(headless: boolean): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    ...chromeLaunchOptions(),
    viewport: { width: 1280, height: 900 },
    args: ["--disable-dev-shm-usage"],
  });
}

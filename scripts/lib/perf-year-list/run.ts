import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext } from "playwright-core";
import { PROFILE_DIR } from "./cli.ts";
import { YearListPage, type ClientMarks, type ServerTiming } from "./year-list-page.ts";

export const READY_MARKER = path.join(PROFILE_DIR, ".access-ready");

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

export async function ensureAccess(context: BrowserContext, url: string, headed: boolean): Promise<void> {
  const page = await context.newPage();
  const gallery = new YearListPage(page);
  try {
    await gallery.openForAccess(url);
    if (gallery.isOnAccess()) {
      if (!headed) {
        throw new Error(
          "Cloudflare Access のログインが必要です。画面ありで一度 `pnpm perf:year-list` を実行し、ログインしてください。",
        );
      }
      console.error("Cloudflare Access にログインしてください。完了すると計測に進みます…");
    }
    await gallery.waitForShell();
    mkdirSync(PROFILE_DIR, { recursive: true });
    writeFileSync(READY_MARKER, `${new Date().toISOString()}\n`);
  } finally {
    await page.close();
  }
}

export async function oneRun(context: BrowserContext, url: string): Promise<RunSample> {
  const page = await context.newPage();
  const gallery = new YearListPage(page);
  try {
    await gallery.clearCache();
    const timing = gallery.attachServerTimingListener();
    await gallery.openForMeasure(url);
    if (gallery.isOnAccess()) {
      throw new Error(
        "Access に戻りました。プロフィールのログインが切れているので、画面ありでもう一度実行してください。",
      );
    }
    const client = await gallery.collectMarks();
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

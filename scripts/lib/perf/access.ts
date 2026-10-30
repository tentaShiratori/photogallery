import { mkdirSync, writeFileSync } from "node:fs";
import type { BrowserContext } from "playwright-core";
import { ACCESS_TIMEOUT_MS, GOTO_TIMEOUT_MS, PROFILE_DIR, READY_MARKER } from "./constants.ts";

function isAccessUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
  } catch {
    return false;
  }
}

export function pageIsOnAccess(pageUrl: string): boolean {
  return isAccessUrl(pageUrl);
}

export async function ensureAccess(
  context: BrowserContext,
  url: string,
  headed: boolean,
  deps: {
    mkdirSync?: typeof mkdirSync;
    writeFileSync?: typeof writeFileSync;
  } = {},
): Promise<void> {
  const makeDir = deps.mkdirSync ?? mkdirSync;
  const writeFile = deps.writeFileSync ?? writeFileSync;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
    if (pageIsOnAccess(page.url())) {
      if (!headed) {
        throw new Error(
          "Cloudflare Access のログインが必要です。画面ありで一度 `pnpm perf` を実行し、ログインしてください。",
        );
      }
      console.error("Cloudflare Access にログインしてください。完了すると計測に進みます…");
    }
    await page.waitForFunction(
      () => {
        const titleOk = document.title.includes("フォトギャラリー");
        const host = location.hostname;
        const access = host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
        return titleOk && !access;
      },
      { timeout: ACCESS_TIMEOUT_MS },
    );
    makeDir(PROFILE_DIR, { recursive: true });
    writeFile(READY_MARKER, `${new Date().toISOString()}\n`);
  } finally {
    await page.close();
  }
}

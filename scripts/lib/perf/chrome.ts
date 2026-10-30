import { existsSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright-core";
import { perfYearListEnv } from "../env.ts";
import { PROFILE_DIR, VIEWPORT } from "./constants.ts";

export function chromePath(): string | undefined {
  const candidates = [
    perfYearListEnv().PHOTOGALLERY_CHROME,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function chromeLaunchOptions(): { readonly channel?: "chrome"; readonly executablePath?: string } {
  const executablePath = chromePath();
  if (executablePath !== undefined) return { executablePath };
  return { channel: "chrome" };
}

export async function openContext(headless: boolean): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    ...chromeLaunchOptions(),
    viewport: VIEWPORT,
    args: ["--disable-dev-shm-usage"],
  });
}

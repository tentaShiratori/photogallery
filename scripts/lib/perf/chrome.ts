import { existsSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright-core";
import { perfYearListEnv } from "../env.ts";
import { PROFILE_DIR, VIEWPORT } from "./constants.ts";

export function chromePath(
  deps: {
    existsSync?: (candidate: string) => boolean;
    envChrome?: string;
  } = {},
): string | undefined {
  const exists = deps.existsSync ?? existsSync;
  const configured = "envChrome" in deps ? deps.envChrome : perfYearListEnv().PHOTOGALLERY_CHROME;
  const candidates = [
    configured,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return undefined;
}

export async function openContext(
  headless: boolean,
  deps: {
    launch?: (
      userDataDir: string,
      options: Parameters<typeof chromium.launchPersistentContext>[1],
    ) => Promise<BrowserContext>;
    chromePath?: () => string | undefined;
  } = {},
): Promise<BrowserContext> {
  const executablePath = (deps.chromePath ?? chromePath)();
  const launch = deps.launch ?? ((userDataDir, options) => chromium.launchPersistentContext(userDataDir, options));
  return launch(PROFILE_DIR, {
    headless,
    ...(executablePath !== undefined ? { executablePath } : { channel: "chrome" }),
    viewport: VIEWPORT,
    args: ["--disable-dev-shm-usage"],
  });
}

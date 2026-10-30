import type { Page } from "playwright-core";
import { pageIsOnAccess } from "./access.ts";
import { GOTO_TIMEOUT_MS, MARK_TIMEOUT_MS } from "./constants.ts";
import { injectCollectors } from "./inject.ts";

export async function preparePage(page: Page): Promise<void> {
  await injectCollectors(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.clearBrowserCache");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
}

export async function openForMeasure(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  if (pageIsOnAccess(page.url())) {
    throw new Error(
      "Access に戻りました。プロフィールのログインが切れているので、画面ありでもう一度実行してください。",
    );
  }
}

export async function collectMarks(page: Page, names: readonly string[]): Promise<Readonly<Record<string, number>>> {
  await page.waitForFunction(
    (markNames: readonly string[]) => markNames.every((name) => performance.getEntriesByName(name).length > 0),
    names,
    { timeout: MARK_TIMEOUT_MS },
  );
  return page.evaluate((markNames) => {
    const marks: Record<string, number> = {};
    for (const name of markNames) {
      const entry = performance.getEntriesByName(name)[0];
      if (!entry) throw new Error(`missing mark: ${name}`);
      marks[name] = entry.startTime;
    }
    return marks;
  }, names);
}

export function yearScreenHref(baseUrl: string, yearToken: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("year", yearToken);
  return url.href;
}

import type { Page } from "playwright-core";
import { collectPaintAndVitals } from "./inject.ts";
import { collectMarks, openForMeasure, preparePage, yearScreenHref } from "./page.ts";
import { attachServerTimingListener } from "./server-timing.ts";
import type { PlaywrightSample } from "./types.ts";

const YEAR_LIST_MARKS = ["year-list-loading", "year-list-api", "year-list-ready"] as const;
const YEAR_SCREEN_MARKS = ["year-screen-loading", "year-screen-api", "year-screen-ready"] as const;
const ENLARGED_MARKS = ["enlarged-open", "enlarged-ready"] as const;

export async function measureYearList(page: Page, baseUrl: string): Promise<PlaywrightSample> {
  await preparePage(page);
  const timing = attachServerTimingListener(page, false);
  await openForMeasure(page, baseUrl);
  const marks = await collectMarks(page, YEAR_LIST_MARKS);
  const { paint, vitals } = await collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

export async function measureYearScreen(page: Page, baseUrl: string, yearToken: string): Promise<PlaywrightSample> {
  await preparePage(page);
  const timing = attachServerTimingListener(page, true);
  await openForMeasure(page, yearScreenHref(baseUrl, yearToken));
  const marks = await collectMarks(page, YEAR_SCREEN_MARKS);
  const { paint, vitals } = await collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

export async function measureEnlarged(page: Page, baseUrl: string, yearToken: string): Promise<PlaywrightSample> {
  await preparePage(page);
  const timing = attachServerTimingListener(page, true);
  await openForMeasure(page, yearScreenHref(baseUrl, yearToken));
  await collectMarks(page, YEAR_SCREEN_MARKS);
  const tile = page.locator('#grid button[data-kind="image"]').first();
  await tile.click();
  const marks = await collectMarks(page, ENLARGED_MARKS);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const { paint, vitals } = await collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

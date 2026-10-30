import type { Page } from "playwright-core";
import { collectPaintAndVitals } from "./inject.ts";
import { collectMarks, openForMeasure, preparePage, yearScreenHref } from "./page.ts";
import { attachServerTimingListener } from "./server-timing.ts";
import type { PlaywrightSample } from "./types.ts";

const YEAR_LIST_MARKS = ["year-list-loading", "year-list-api", "year-list-ready"] as const;
const YEAR_SCREEN_MARKS = ["year-screen-loading", "year-screen-api", "year-screen-ready"] as const;
const ENLARGED_MARKS = ["enlarged-open", "enlarged-ready"] as const;

export type MeasureDeps = {
  preparePage?: typeof preparePage;
  openForMeasure?: typeof openForMeasure;
  collectMarks?: typeof collectMarks;
  collectPaintAndVitals?: typeof collectPaintAndVitals;
  attachServerTimingListener?: typeof attachServerTimingListener;
  sleep?: (ms: number) => Promise<void>;
};

function bound(deps: MeasureDeps) {
  return {
    preparePage: deps.preparePage ?? preparePage,
    openForMeasure: deps.openForMeasure ?? openForMeasure,
    collectMarks: deps.collectMarks ?? collectMarks,
    collectPaintAndVitals: deps.collectPaintAndVitals ?? collectPaintAndVitals,
    attachServerTimingListener: deps.attachServerTimingListener ?? attachServerTimingListener,
    sleep: deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms))),
  };
}

export async function measureYearList(page: Page, baseUrl: string, deps: MeasureDeps = {}): Promise<PlaywrightSample> {
  const step = bound(deps);
  await step.preparePage(page);
  const timing = step.attachServerTimingListener(page, false);
  await step.openForMeasure(page, baseUrl);
  const marks = await step.collectMarks(page, YEAR_LIST_MARKS);
  const { paint, vitals } = await step.collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

export async function measureYearScreen(
  page: Page,
  baseUrl: string,
  yearToken: string,
  deps: MeasureDeps = {},
): Promise<PlaywrightSample> {
  const step = bound(deps);
  await step.preparePage(page);
  const timing = step.attachServerTimingListener(page, true);
  await step.openForMeasure(page, yearScreenHref(baseUrl, yearToken));
  const marks = await step.collectMarks(page, YEAR_SCREEN_MARKS);
  const { paint, vitals } = await step.collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

export async function measureEnlarged(
  page: Page,
  baseUrl: string,
  yearToken: string,
  deps: MeasureDeps = {},
): Promise<PlaywrightSample> {
  const step = bound(deps);
  await step.preparePage(page);
  const timing = step.attachServerTimingListener(page, true);
  await step.openForMeasure(page, yearScreenHref(baseUrl, yearToken));
  await step.collectMarks(page, YEAR_SCREEN_MARKS);
  const tile = page.locator('#grid button[data-kind="image"]').first();
  await tile.click();
  const marks = await step.collectMarks(page, ENLARGED_MARKS);
  await step.sleep(300);
  const { paint, vitals } = await step.collectPaintAndVitals(page);
  return { marks, paint, vitals, server: timing.take() };
}

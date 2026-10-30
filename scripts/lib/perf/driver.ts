import type { BrowserContext, Page } from "playwright-core";
import { MEASURE_RUNS, WARMUP_RUNS } from "./constants.ts";
import { runLighthouse } from "./lighthouse.ts";
import { yearScreenHref } from "./page.ts";
import { printHeader, printScenario } from "./report.ts";
import { resolveYearToken } from "./resolve-year.ts";
import { measureEnlarged, measureYearList, measureYearScreen } from "./scenarios.ts";
import type { LighthouseSample, PlaywrightSample, ScenarioName } from "./types.ts";

export type ScenarioDriver = {
  resolveYearToken?: typeof resolveYearToken;
  measureYearList?: typeof measureYearList;
  measureYearScreen?: typeof measureYearScreen;
  measureEnlarged?: typeof measureEnlarged;
  runLighthouse?: typeof runLighthouse;
  printHeader?: typeof printHeader;
  printScenario?: typeof printScenario;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

async function withPage<T>(context: BrowserContext, run: (page: Page) => Promise<T>): Promise<T> {
  const page = await context.newPage();
  try {
    return await run(page);
  } finally {
    await page.close();
  }
}

async function measureLoop(
  context: BrowserContext,
  label: string,
  url: string,
  run: (page: Page) => Promise<PlaywrightSample>,
  error: (message: string) => void,
): Promise<PlaywrightSample[]> {
  error(`暖機 ${WARMUP_RUNS} 回のあと、計測 ${MEASURE_RUNS} 回… ${label} (${url})`);
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await withPage(context, run);
  }
  const samples: PlaywrightSample[] = [];
  for (let i = 0; i < MEASURE_RUNS; i++) {
    const sample = await withPage(context, run);
    samples.push(sample);
    const ready =
      sample.marks["year-list-ready"] ?? sample.marks["year-screen-ready"] ?? sample.marks["enlarged-ready"];
    error(
      `  #${i + 1}/${MEASURE_RUNS} ready=${ready?.toFixed(0) ?? "?"} r2=${sample.server.r2Calls}/${sample.server.r2Ms.toFixed(0)}ms`,
    );
  }
  return samples;
}

function needsYear(scenarios: readonly ScenarioName[]): boolean {
  return scenarios.some((name) => name === "year-screen" || name === "enlarged");
}

function lighthouseUrl(name: ScenarioName, baseUrl: string, yearToken: string | null): string | null {
  if (name === "year-list") return baseUrl;
  if (name === "year-screen" && yearToken !== null) return yearScreenHref(baseUrl, yearToken);
  return null;
}

export async function runScenarios(
  context: BrowserContext,
  baseUrl: string,
  local: boolean,
  scenarios: readonly ScenarioName[],
  yearFlag: string | null,
  driver: ScenarioDriver = {},
): Promise<void> {
  const resolveYear = driver.resolveYearToken ?? resolveYearToken;
  const yearList = driver.measureYearList ?? measureYearList;
  const yearScreen = driver.measureYearScreen ?? measureYearScreen;
  const enlarged = driver.measureEnlarged ?? measureEnlarged;
  const lighthouse = driver.runLighthouse ?? runLighthouse;
  const header = driver.printHeader ?? printHeader;
  const scenario = driver.printScenario ?? printScenario;
  const log = driver.log ?? ((message: string) => console.log(message));
  const error = driver.error ?? ((message: string) => console.error(message));

  const yearToken = needsYear(scenarios) ? await resolveYear(context, baseUrl, yearFlag) : null;
  const collected: { name: ScenarioName; samples: PlaywrightSample[] }[] = [];

  for (const name of scenarios) {
    if (name === "year-list") {
      collected.push({
        name,
        samples: await measureLoop(context, "年の一覧", baseUrl, (page) => yearList(page, baseUrl), error),
      });
      continue;
    }
    if (yearToken === null) throw new Error("対象年がありません。");
    if (name === "year-screen") {
      collected.push({
        name,
        samples: await measureLoop(
          context,
          "年の画面",
          yearScreenHref(baseUrl, yearToken),
          (page) => yearScreen(page, baseUrl, yearToken),
          error,
        ),
      });
      continue;
    }
    collected.push({
      name,
      samples: await measureLoop(
        context,
        "拡大表示",
        yearScreenHref(baseUrl, yearToken),
        (page) => enlarged(page, baseUrl, yearToken),
        error,
      ),
    });
  }

  const cookies = await context.cookies();
  await context.close();

  const lighthouseByName = new Map<ScenarioName, readonly LighthouseSample[] | null>();
  for (const name of scenarios) {
    const url = lighthouseUrl(name, baseUrl, yearToken);
    lighthouseByName.set(name, url === null ? null : await lighthouse(url, cookies));
  }

  header(baseUrl, local);
  if (yearToken !== null) log(`対象年: ${yearToken}`);
  log("");
  for (const item of collected) {
    scenario(item.name, item.samples, lighthouseByName.get(item.name) ?? null);
  }
}

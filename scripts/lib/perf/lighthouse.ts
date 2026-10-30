import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";
import { chromePath } from "./chrome.ts";
import { LH_MEASURE_RUNS, LH_WARMUP_RUNS, VIEWPORT } from "./constants.ts";
import type { LighthouseSample } from "./types.ts";

type CookieLike = {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
};

function numeric(lhr: { audits: Record<string, { numericValue?: number } | undefined> }, id: string): number {
  const value = lhr.audits[id]?.numericValue;
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Lighthouse の ${id} がありません。`);
  }
  return value;
}

function opportunities(lhr: {
  audits: Record<string, { title?: string; numericValue?: number; details?: { type?: string } } | undefined>;
}): readonly string[] {
  return Object.values(lhr.audits)
    .filter((audit) => audit?.details?.type === "opportunity" && (audit.numericValue ?? 0) > 0)
    .sort((a, b) => (b?.numericValue ?? 0) - (a?.numericValue ?? 0))
    .slice(0, 3)
    .map((audit) => `${audit?.title ?? "?"}: ${(audit?.numericValue ?? 0).toFixed(0)} ms`);
}

function toSample(lhr: {
  categories: { performance?: { score: number | null } };
  audits: Record<string, { numericValue?: number; title?: string; details?: { type?: string } } | undefined>;
}): LighthouseSample {
  const score = lhr.categories.performance?.score;
  if (score === null || score === undefined) throw new Error("Lighthouse の Performance スコアがありません。");
  return {
    score: score * 100,
    fcpMs: numeric(lhr, "first-contentful-paint"),
    lcpMs: numeric(lhr, "largest-contentful-paint"),
    tbtMs: numeric(lhr, "total-blocking-time"),
    cls: numeric(lhr, "cumulative-layout-shift"),
    speedIndexMs: numeric(lhr, "speed-index"),
    opportunities: opportunities(lhr),
  };
}

function extraHeadersFromCookies(
  url: string,
  cookies: readonly CookieLike[],
): Readonly<Record<string, string>> | undefined {
  const host = new URL(url).hostname;
  const parts = cookies
    .filter((cookie) => {
      const domain = cookie.domain.replace(/^\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  if (parts.length === 0) return undefined;
  return { Cookie: parts.join("; ") };
}

export type LighthouseDeps = {
  launch?: typeof launch;
  lighthouse?: typeof lighthouse;
  chromePath?: () => string | undefined;
  error?: (message: string) => void;
};

async function oneLighthouse(
  url: string,
  extraHeaders: Readonly<Record<string, string>> | undefined,
  deps: LighthouseDeps,
): Promise<LighthouseSample> {
  const start = deps.launch ?? launch;
  const audit = deps.lighthouse ?? lighthouse;
  const chrome = await start({
    chromePath: (deps.chromePath ?? chromePath)(),
    logLevel: "silent",
    chromeFlags: ["--headless=new", "--disable-dev-shm-usage", `--window-size=${VIEWPORT.width},${VIEWPORT.height}`],
  });
  try {
    const result = await audit(
      url,
      {
        port: chrome.port,
        output: "json",
        logLevel: "silent",
        onlyCategories: ["performance"],
        extraHeaders,
        screenEmulation: {
          mobile: false,
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
      desktopConfig,
    );
    if (result?.lhr === undefined) throw new Error("Lighthouse が結果を返しませんでした。");
    return toSample(result.lhr);
  } finally {
    chrome.kill();
  }
}

export async function runLighthouse(
  url: string,
  cookies: readonly CookieLike[] = [],
  deps: LighthouseDeps = {},
): Promise<readonly LighthouseSample[]> {
  const extraHeaders = extraHeadersFromCookies(url, cookies);
  const error = deps.error ?? ((message: string) => console.error(message));
  error(`Lighthouse 暖機 ${LH_WARMUP_RUNS} 回のあと、計測 ${LH_MEASURE_RUNS} 回… (${url})`);
  for (let i = 0; i < LH_WARMUP_RUNS; i++) {
    await oneLighthouse(url, extraHeaders, deps);
  }
  const samples: LighthouseSample[] = [];
  for (let i = 0; i < LH_MEASURE_RUNS; i++) {
    const sample = await oneLighthouse(url, extraHeaders, deps);
    samples.push(sample);
    error(
      `  Lighthouse #${i + 1}/${LH_MEASURE_RUNS} score=${sample.score.toFixed(0)} fcp=${sample.fcpMs.toFixed(0)} lcp=${sample.lcpMs.toFixed(0)}`,
    );
  }
  return samples;
}

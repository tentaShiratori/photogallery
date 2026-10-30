export type ServerTiming = {
  readonly r2Calls: number;
  readonly r2Ms: number;
  readonly totalMs: number;
};

export type PaintMetrics = {
  readonly fcpMs: number;
  readonly lcpMs: number;
  readonly ttfbMs: number;
};

export type WebVitalsMetrics = {
  readonly fcpMs: number | null;
  readonly lcpMs: number | null;
  readonly cls: number | null;
  readonly ttfbMs: number | null;
  readonly inpMs: number | null;
};

export type PlaywrightSample = {
  readonly marks: Readonly<Record<string, number>>;
  readonly paint: PaintMetrics;
  readonly vitals: WebVitalsMetrics;
  readonly server: ServerTiming;
};

export type LighthouseSample = {
  readonly score: number;
  readonly fcpMs: number;
  readonly lcpMs: number;
  readonly tbtMs: number;
  readonly cls: number;
  readonly speedIndexMs: number;
  readonly opportunities: readonly string[];
};

export type ScenarioName = "year-list" | "year-screen" | "enlarged";

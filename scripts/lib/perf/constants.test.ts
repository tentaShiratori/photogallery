import { describe, expect, it } from "vite-plus/test";
import {
  ACCESS_TIMEOUT_MS,
  DEFAULT_PRODUCTION_URL,
  GOTO_TIMEOUT_MS,
  LH_MEASURE_RUNS,
  LH_WARMUP_RUNS,
  LOCAL_URL,
  MARK_TIMEOUT_MS,
  MEASURE_RUNS,
  PROFILE_DIR,
  READY_MARKER,
  VIEWPORT,
  WARMUP_RUNS,
} from "./constants.ts";

describe("perf constants", () => {
  it("URL・回数・ビューポートが決まった値", () => {
    expect(LOCAL_URL).toBe("http://localhost:8787");
    expect(DEFAULT_PRODUCTION_URL).toBe("https://photogallery.tentashiratori.workers.dev");
    expect(VIEWPORT).toEqual({ width: 1280, height: 900 });
    expect(WARMUP_RUNS).toBe(1);
    expect(MEASURE_RUNS).toBe(10);
    expect(LH_WARMUP_RUNS).toBe(1);
    expect(LH_MEASURE_RUNS).toBe(3);
    expect(GOTO_TIMEOUT_MS).toBe(120_000);
    expect(MARK_TIMEOUT_MS).toBe(120_000);
    expect(ACCESS_TIMEOUT_MS).toBe(10 * 60 * 1000);
    expect(PROFILE_DIR.endsWith(".photogallery-perf")).toBe(true);
    expect(READY_MARKER.endsWith(".access-ready")).toBe(true);
  });
});

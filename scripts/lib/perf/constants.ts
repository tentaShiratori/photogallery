import { homedir } from "node:os";
import path from "node:path";

export const LOCAL_URL = "http://localhost:8787";
export const DEFAULT_PRODUCTION_URL = "https://photogallery.tentashiratori.workers.dev";
export const PROFILE_DIR = path.join(homedir(), ".photogallery-perf");
export const READY_MARKER = path.join(PROFILE_DIR, ".access-ready");
export const VIEWPORT = { width: 1280, height: 900 } as const;
export const WARMUP_RUNS = 1;
export const MEASURE_RUNS = 10;
export const LH_WARMUP_RUNS = 1;
export const LH_MEASURE_RUNS = 3;
export const GOTO_TIMEOUT_MS = 120_000;
export const MARK_TIMEOUT_MS = 120_000;
export const ACCESS_TIMEOUT_MS = 10 * 60 * 1000;

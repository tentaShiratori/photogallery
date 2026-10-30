import type { Lister } from "./types.ts";

/** R2 `list` call count and wall time accumulated by {@link timedLister}. */
export type ListTimingStats = {
  readonly r2Calls: number;
  readonly r2DurationMs: number;
};

/**
 * Wraps a {@link Lister} so each `list` call is counted and timed.
 * Stats cover only the wrapped calls; the caller measures end-to-end separately.
 */
export function timedLister(bucket: Lister): {
  readonly bucket: Lister;
  readonly stats: () => ListTimingStats;
} {
  let r2Calls = 0;
  let r2DurationMs = 0;
  return {
    bucket: {
      async list(options) {
        r2Calls += 1;
        const started = performance.now();
        try {
          return await bucket.list(options);
        } finally {
          r2DurationMs += performance.now() - started;
        }
      },
    },
    stats: () => ({ r2Calls, r2DurationMs }),
  };
}

/**
 * Builds a `Server-Timing` value for `/api/media` JSON success responses.
 * `r2` carries the list call count in `desc` and the summed list time in `dur`.
 * `total` is the handler wall time until the response is ready.
 */
export function serverTimingHeader(stats: ListTimingStats, totalDurationMs: number): string {
  const r2Dur = Math.max(0, stats.r2DurationMs).toFixed(1);
  const totalDur = Math.max(0, totalDurationMs).toFixed(1);
  return `r2;desc="${stats.r2Calls}";dur=${r2Dur}, total;dur=${totalDur}`;
}

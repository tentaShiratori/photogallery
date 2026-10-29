import { describe, expect, it } from "vite-plus/test";
import { memoryBucket, pairOf } from "./fixtures.ts";
import { readYearList, serverTimingHeader, timedLister, type ListTimingStats } from "./index.ts";

describe("timedLister と serverTimingHeader", () => {
  it("list の回数と時間を積み、Server-Timing 文字列にする", async () => {
    const bucket = memoryBucket([...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z")]);
    const timed = timedLister(bucket.bucket);
    await readYearList(timed.bucket);
    const stats: ListTimingStats = timed.stats();
    expect(stats.r2Calls).toBeGreaterThan(0);
    expect(stats.r2DurationMs).toBeGreaterThanOrEqual(0);
    expect(serverTimingHeader(stats, 12.34)).toBe(
      `r2;desc="${stats.r2Calls}";dur=${stats.r2DurationMs.toFixed(1)}, total;dur=12.3`,
    );
  });
});

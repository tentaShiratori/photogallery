import { describe, expect, it } from "vite-plus/test";
import { memoryBucket, pairOf, stored, year } from "./fixtures.ts";
import {
  readYearContents,
  readYearList,
  timedLister,
  type Lister,
  type YearListYear,
} from "./index.ts";

describe("readYearList", () => {
  it("新しい年からカードを返し、プレビューは bodyKey の昇順で最大 4 件、年不明は最後", async () => {
    const bucket = memoryBucket([
      ...pairOf("2024-12-02T08-00-00.jpg", "2026-01-01T00:00:00.000Z"),
      ...pairOf("2024-01-02T08-00-00.jpg", "2026-06-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
      ...pairOf("2024-03-01T00-00-00.jpg", "2026-02-01T00:00:00.000Z"),
      ...pairOf("2024-09-01T00-00-00.jpg", "2026-03-01T00:00:00.000Z"),
      ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
      ...pairOf("u-abc123def456.png", "2026-10-18T09:00:00.000Z"),
    ]);
    const list: { readonly years: readonly YearListYear[] } = await readYearList(bucket.bucket);
    expect(list.years.map((card) => card.label)).toEqual(["2024", "2020", "年不明"]);
    expect(list.years[0]?.previews.map((item) => item.bodyKey)).toEqual([
      "2024-01-02T08-00-00.jpg",
      "2024-03-01T00-00-00.jpg",
      "2024-08-02T12-00-00.jpg",
      "2024-09-01T00-00-00.jpg",
    ]);
    expect(list.years.at(-1)?.previews.map((item) => item.bodyKey)).toEqual(["u-abc123def456.png"]);
  });

  it("組の無い年はカードに含めない", async () => {
    const bucket = memoryBucket([
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
      stored("2022-01-01T00-00-00.jpg", "2026-10-18T08:00:00.000Z"),
    ]);
    const list = await readYearList(bucket.bucket);
    expect(list.years.map((year) => year.label)).toEqual(["2024"]);
  });

  it("プレビューは先頭 4 組で打ち切り、その年の残りは読まない", async () => {
    const objects: ReturnType<typeof stored>[] = [];
    for (let i = 0; i < 80; i++) {
      const minute = String(Math.floor(i / 60)).padStart(2, "0");
      const second = String(i % 60).padStart(2, "0");
      objects.push(
        ...pairOf(`2024-01-01T00-${minute}-${second}-${i + 2}.jpg`, "2026-01-01T00:00:00.000Z"),
      );
    }
    const bucket = memoryBucket(objects);
    const timed = timedLister(bucket.bucket);
    const list = await readYearList(timed.bucket);
    expect(list.years).toHaveLength(1);
    expect(list.years[0]?.previews.map((item) => item.bodyKey)).toEqual([
      "2024-01-01T00-00-00-2.jpg",
      "2024-01-01T00-00-01-3.jpg",
      "2024-01-01T00-00-02-4.jpg",
      "2024-01-01T00-00-03-5.jpg",
    ]);
    expect(bucket.objectsRead("2024-")).toBeLessThan(80);
    expect(bucket.objectsRead("t/2024-")).toBeLessThan(80);
    expect(timed.stats().r2Calls).toBeLessThan(10);
  });
});

describe("readYearContents", () => {
  it("年内は暦の降順のまま返す", async () => {
    const bucket = memoryBucket([
      ...pairOf("2024-08-02T12-00-00-3.jpg", "2026-01-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00-2.jpg", "2026-01-02T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
    ]);
    const group = await readYearContents(bucket.bucket, year(2024));
    expect(group?.truncated).toBe(false);
    expect(group?.items.map((item) => item.bodyKey)).toEqual([
      "2024-08-02T12-00-00-2.jpg",
      "2024-08-02T12-00-00.jpg",
      "2024-08-02T12-00-00-3.jpg",
    ]);
  });

  it("続きが進まない年は打ち切って truncated にする", async () => {
    const inner = memoryBucket([
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
      ...pairOf("2024-01-02T08-00-00.jpg", "2026-01-01T00:00:00.000Z"),
    ]);
    const stalled: Lister = {
      async list(options) {
        if (options.prefix !== "t/2024-") return inner.bucket.list(options);
        const listed = await inner.bucket.list({ ...options, cursor: undefined });
        return {
          objects: listed.objects,
          delimitedPrefixes: [],
          truncated: true,
          cursor: "again",
        };
      },
    };
    const group = await readYearContents(stalled, year(2024));
    expect(group?.truncated).toBe(true);
    expect(group?.label).toBe("2024");
    expect(group?.items.map((item) => item.bodyKey)).toEqual([
      "2024-08-02T12-00-00.jpg",
      "2024-01-02T08-00-00.jpg",
    ]);
  });

  it("組が無い年は null", async () => {
    const bucket = memoryBucket([stored("2022-01-01T00-00-00.jpg", "2026-01-01T00:00:00.000Z")]);
    expect(await readYearContents(bucket.bucket, year(2022))).toBeNull();
  });
});

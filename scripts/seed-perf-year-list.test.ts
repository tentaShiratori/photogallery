import { describe, expect, it } from "vite-plus/test";
import type { BodyKey } from "../src/lib/name/index.ts";
import { thumbKeyFor } from "../src/lib/name/index.ts";
import { bodyKey, seedPerfYearList } from "./seed-perf-year-list.ts";

describe("bodyKey", () => {
  it("年と通し番号から日付の本体キーを作る", () => {
    expect(bodyKey(2024, 0)).toBe("2024-01-01T00-00-00-2.png");
    expect(bodyKey(2024, 28)).toBe("2024-01-01T01-00-00-30.png");
    expect(bodyKey(2024, 28 * 24)).toBe("2024-01-01T00-01-00-674.png");
    expect(bodyKey(2024, 28 * 24 * 60)).toBe("2024-01-01T00-00-01-40322.png");
  });
});

describe("seedPerfYearList", () => {
  it("ペアと年不明を入れてから捨てる", async () => {
    const puts: string[] = [];
    let disposed = false;
    const logs: string[] = [];
    const written = await seedPerfYearList({
      years: [2024],
      pairsPerYear: 1,
      encodeThumb: async () => Buffer.from("thumb"),
      rmSync: () => undefined,
      mkdirSync: () => undefined,
      log: (message) => logs.push(message),
      openBucket: async () => ({
        bucket: {
          put: async (key) => {
            puts.push(key);
          },
        },
        dispose: async () => {
          disposed = true;
        },
      }),
    });
    const key = bodyKey(2024, 0);
    const unknown = "u-abc123def456.png" as BodyKey;
    expect(written).toBe(2);
    expect(puts).toEqual([thumbKeyFor(key), key, thumbKeyFor(unknown), unknown]);
    expect(disposed).toBe(true);
    expect(logs[0]).toBe("year 2024: 1 pairs");
    expect(logs[1]).toContain("done: 2 bodies");
  });

  it("書き込みに失敗しても接続を閉じる", async () => {
    let disposed = false;
    await expect(
      seedPerfYearList({
        years: [2024],
        pairsPerYear: 1,
        encodeThumb: async () => Buffer.from("thumb"),
        rmSync: () => undefined,
        mkdirSync: () => undefined,
        log: () => undefined,
        openBucket: async () => ({
          bucket: {
            put: async () => {
              throw new Error("full");
            },
          },
          dispose: async () => {
            disposed = true;
          },
        }),
      }),
    ).rejects.toThrow("full");
    expect(disposed).toBe(true);
  });
});

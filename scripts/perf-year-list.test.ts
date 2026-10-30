import { describe, expect, it } from "vite-plus/test";
import { startYearListPerf } from "./perf-year-list.ts";

describe("startYearListPerf", () => {
  it("年の一覧シナリオを先頭に付ける", async () => {
    let seen: readonly string[] = [];
    await startYearListPerf(["--local"], {
      run: async (argv) => {
        seen = argv;
      },
    });
    expect([...seen]).toEqual(["--scenario", "year-list", "--local"]);
  });

  it("失敗した文字列も終了コード 1", async () => {
    const errors: unknown[] = [];
    const exits: number[] = [];
    await startYearListPerf([], {
      run: async () => {
        throw "down";
      },
      error: (message) => errors.push(message),
      exit: (code) => exits.push(code),
    });
    expect(errors).toEqual(["down"]);
    expect(exits).toEqual([1]);
  });
});

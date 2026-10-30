import { describe, expect, it } from "vite-plus/test";
import { startPerf } from "./perf.ts";

describe("startPerf", () => {
  it("成功したら何もしない", async () => {
    const exits: number[] = [];
    await startPerf(["--local"], {
      run: async () => undefined,
      exit: (code) => exits.push(code),
    });
    expect(exits).toEqual([]);
  });

  it("失敗したらメッセージを出して終了する", async () => {
    const exits: number[] = [];
    const errors: unknown[] = [];
    await startPerf([], {
      run: async () => {
        throw new Error("nope");
      },
      exit: (code) => exits.push(code),
      error: (message) => errors.push(message),
    });
    expect(errors).toEqual(["nope"]);
    expect(exits).toEqual([1]);
  });
});

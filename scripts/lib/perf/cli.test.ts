import type { spawnSync } from "node:child_process";
import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_PRODUCTION_URL, LOCAL_URL } from "./constants.ts";
import { gitCommit, jstStamp, parseArgs } from "./cli.ts";

class Stop extends Error {
  readonly code: number;
  constructor(code: number) {
    super(`exit ${code}`);
    this.code = code;
  }
}

const exit = (code: number): never => {
  throw new Stop(code);
};

function args(argv: readonly string[], productionUrl?: () => string | undefined) {
  const errors: string[] = [];
  try {
    const parsed = parseArgs(argv, {
      exit,
      error: (message) => errors.push(message),
      ...(productionUrl ? { productionUrl } : {}),
    });
    return { parsed, errors };
  } catch (error) {
    if (error instanceof Stop) return { parsed: null, errors, code: error.code };
    throw error;
  }
}

describe("parseArgs", () => {
  it("本番 URL と 3 シナリオが既定", () => {
    const { parsed } = args([], () => "https://gallery.example/");
    expect(parsed).toEqual({
      local: false,
      url: "https://gallery.example/",
      scenarios: ["year-list", "year-screen", "enlarged"],
      year: null,
    });
  });

  it("URL 未設定なら本番の既定、--local はローカル", () => {
    expect(args([], () => undefined).parsed?.url).toBe(DEFAULT_PRODUCTION_URL);
    expect(args(["--", "--local"], () => "https://gallery.example/").parsed).toMatchObject({
      local: true,
      url: LOCAL_URL,
    });
  });

  it("シナリオと年を選ぶ", () => {
    expect(args(["--scenario", "year-list", "--scenario=enlarged", "--year", "2024"]).parsed).toMatchObject({
      scenarios: ["year-list", "enlarged"],
      year: "2024",
    });
    expect(args(["--year=unknown"]).parsed?.year).toBe("unknown");
    expect(args(["--year=2020"], () => undefined).parsed?.year).toBe("2020");
  });

  it("不正な引数は使い方を出して 2 で終わる", () => {
    for (const argv of [
      ["--help"],
      ["-h"],
      ["--scenario"],
      ["--scenario", "nope"],
      ["--scenario="],
      ["--year"],
      ["--year="],
      ["--year", "0"],
      ["--year=0123"],
      ["--wat"],
    ]) {
      const result = args(argv, () => undefined);
      expect(result.code).toBe(2);
      expect(result.errors.some((line) => line.includes("使い方:"))).toBe(true);
    }
    expect(args(["--wat"]).errors[0]).toBe("不明な引数: --wat");
    expect(args(["--year", "0"]).errors[0]).toBe("不正な --year: 0");
  });
});

describe("jstStamp", () => {
  it("Asia/Tokyo の日時", () => {
    expect(jstStamp(new Date(Date.UTC(2024, 5, 15, 3, 34, 56)))).toBe("2024-06-15 12:34:56 JST");
  });
});

describe("gitCommit", () => {
  it("短い SHA を返し、失敗や空は unknown", () => {
    expect(gitCommit()).toMatch(/^[0-9a-f]{7,}$/);
    const spawn = (() => ({ status: 1, stdout: "ignored" })) as unknown as typeof spawnSync;
    expect(gitCommit(spawn)).toBe("(unknown)");
    const empty = (() => ({ status: 0, stdout: "  \n" })) as unknown as typeof spawnSync;
    expect(gitCommit(empty)).toBe("(unknown)");
    const sha = (() => ({ status: 0, stdout: "abc1234\n" })) as unknown as typeof spawnSync;
    expect(gitCommit(sha)).toBe("abc1234");
    const missing = (() => ({ status: null, stdout: Buffer.from("abc") })) as unknown as typeof spawnSync;
    expect(gitCommit(missing)).toBe("(unknown)");
  });
});

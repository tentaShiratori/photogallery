import { describe, expect, it, vi } from "vite-plus/test";
import { runPerf } from "./main.ts";

function context() {
  return {
    close: vi.fn(async () => undefined),
  };
}

describe("runPerf", () => {
  it("ローカルでは Access を飛ばしてシナリオを回す", async () => {
    const opened: boolean[] = [];
    const runs: unknown[] = [];
    const ctx = context();
    await runPerf(["--local", "--scenario", "year-list"], {
      mkdirSync: () => undefined as unknown as string,
      existsSync: () => false,
      openContext: async (headless) => {
        opened.push(headless);
        return ctx as never;
      },
      ensureAccess: async () => {
        throw new Error("should not access");
      },
      runScenarios: async (...args) => {
        runs.push(args);
      },
    });
    expect(opened).toEqual([true]);
    expect(runs).toHaveLength(1);
  });

  it("初回本番は headed ログインのあと headless で測る", async () => {
    const opened: boolean[] = [];
    const access: boolean[] = [];
    const headed = context();
    const headless = context();
    await runPerf(["--scenario", "year-list"], {
      mkdirSync: () => undefined as unknown as string,
      existsSync: () => false,
      openContext: async (isHeadless) => {
        opened.push(isHeadless);
        return (isHeadless ? headless : headed) as never;
      },
      ensureAccess: async (_ctx, _url, headedFlag) => {
        access.push(headedFlag);
      },
      runScenarios: async () => undefined,
      error: () => undefined,
    });
    expect(opened).toEqual([false, true]);
    expect(access).toEqual([true, false]);
    expect(headed.close).toHaveBeenCalled();
  });

  it("シナリオ失敗時は context を閉じる", async () => {
    const ctx = context();
    await expect(
      runPerf(["--local", "--scenario", "year-list"], {
        mkdirSync: () => undefined as unknown as string,
        existsSync: () => true,
        openContext: async () => ctx as never,
        runScenarios: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");
    expect(ctx.close).toHaveBeenCalled();
  });
});

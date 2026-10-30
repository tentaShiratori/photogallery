import { describe, expect, it, vi } from "vite-plus/test";
import { chromePath, openContext } from "./chrome.ts";
import { PROFILE_DIR, VIEWPORT } from "./constants.ts";

describe("chromePath", () => {
  it("存在する候補の先頭を返す", () => {
    expect(
      chromePath({
        envChrome: "/custom/chrome",
        existsSync: (candidate) => candidate === "/custom/chrome",
      }),
    ).toBe("/custom/chrome");
    expect(chromePath({ envChrome: undefined, existsSync: () => false })).toBeUndefined();
  });
});

describe("openContext", () => {
  it("実行ファイルがあれば executablePath、無ければ channel で開く", async () => {
    const launches: unknown[] = [];
    await openContext(true, {
      chromePath: () => "/bin/chrome",
      launch: async (dir, options) => {
        launches.push({ dir, options });
        return { ok: true } as never;
      },
    });
    await openContext(false, {
      chromePath: () => undefined,
      launch: async (dir, options) => {
        launches.push({ dir, options });
        return { ok: true } as never;
      },
    });
    expect(launches[0]).toEqual({
      dir: PROFILE_DIR,
      options: {
        headless: true,
        executablePath: "/bin/chrome",
        viewport: VIEWPORT,
        args: ["--disable-dev-shm-usage"],
      },
    });
    expect(launches[1]).toEqual({
      dir: PROFILE_DIR,
      options: {
        headless: false,
        channel: "chrome",
        viewport: VIEWPORT,
        args: ["--disable-dev-shm-usage"],
      },
    });
    void vi;
  });
});

import type { Page } from "playwright-core";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { collectMarks, openForMeasure, preparePage, yearScreenHref } from "./page.ts";

describe("yearScreenHref", () => {
  it("年をクエリに足す", () => {
    expect(yearScreenHref("http://localhost:8787/gallery?x=1", "2024")).toBe(
      "http://localhost:8787/gallery?x=1&year=2024",
    );
    expect(yearScreenHref("http://localhost:8787", "unknown")).toBe("http://localhost:8787/?year=unknown");
  });
});

describe("preparePage", () => {
  it("計測用スクリプトとキャッシュ無効を入れる", async () => {
    const sent: string[] = [];
    const page = {
      addInitScript: async () => undefined,
      context: () => ({
        newCDPSession: async () => ({
          send: async (method: string, params?: { cacheDisabled?: boolean }) => {
            sent.push(params?.cacheDisabled ? `${method}:disabled` : method);
          },
        }),
      }),
    } as unknown as Page;
    await preparePage(page);
    expect(sent).toEqual(["Network.enable", "Network.clearBrowserCache", "Network.setCacheDisabled:disabled"]);
  });
});

describe("openForMeasure", () => {
  it("ギャラリーへ進む", async () => {
    let target = "";
    const page = {
      goto: async (url: string) => {
        target = url;
      },
      url: () => "http://localhost:8787/",
    } as unknown as Page;
    await openForMeasure(page, "http://localhost:8787/");
    expect(target).toBe("http://localhost:8787/");
  });

  it("Access に戻ったらログイン切れ", async () => {
    const page = {
      goto: async () => undefined,
      url: () => "https://accounts.google.com/signin",
    } as unknown as Page;
    await expect(openForMeasure(page, "http://localhost:8787/")).rejects.toThrow("Access に戻りました。");
  });
});

const originalPerformance = globalThis.performance;

afterEach(() => {
  globalThis.performance = originalPerformance;
});

describe("collectMarks", () => {
  it("マークの startTime を集める", async () => {
    globalThis.performance = {
      getEntriesByName: (name: string) => [{ name, startTime: name.length }],
    } as unknown as Performance;
    const page = {
      waitForFunction: async (fn: (names: readonly string[]) => boolean, names: readonly string[]) => {
        expect(fn(names)).toBe(true);
      },
      evaluate: async (fn: (names: readonly string[]) => Record<string, number>, names: readonly string[]) => fn(names),
    } as unknown as Page;
    expect(await collectMarks(page, ["year-list-ready"])).toEqual({ "year-list-ready": "year-list-ready".length });
  });

  it("マークが無い", async () => {
    globalThis.performance = { getEntriesByName: () => [] } as unknown as Performance;
    const page = {
      waitForFunction: async () => undefined,
      evaluate: async (fn: (names: readonly string[]) => Record<string, number>, names: readonly string[]) => fn(names),
    } as unknown as Page;
    await expect(collectMarks(page, ["missing"])).rejects.toThrow("missing mark: missing");
  });
});

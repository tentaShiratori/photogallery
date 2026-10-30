import type { BrowserContext } from "playwright-core";
import { describe, expect, it } from "vite-plus/test";
import { resolveYearToken } from "./resolve-year.ts";

function context(body: unknown, status = 200): { ctx: BrowserContext; urls: string[] } {
  const urls: string[] = [];
  const ctx = {
    request: {
      get: async (url: string) => {
        urls.push(url);
        return {
          ok: () => status >= 200 && status < 300,
          status: () => status,
          json: async () => body,
        };
      },
    },
  } as unknown as BrowserContext;
  return { ctx, urls };
}

describe("resolveYearToken", () => {
  it("指定があれば一覧を見ない", async () => {
    const { ctx, urls } = context({});
    expect(await resolveYearToken(ctx, "http://localhost:8787", "2024")).toBe("2024");
    expect(urls).toEqual([]);
  });

  it("先頭の年をトークンにする", async () => {
    const listed = context({ years: [{ label: "2023" }] });
    expect(await resolveYearToken(listed.ctx, "http://localhost:8787/", null)).toBe("2023");
    expect(listed.urls).toEqual(["http://localhost:8787/api/media"]);
    const unknown = context({ years: [{ label: "年不明" }] });
    expect(await resolveYearToken(unknown.ctx, "http://localhost:8787", null)).toBe("unknown");
  });

  it("一覧が失敗か空なら対象年が決まらない", async () => {
    const failed = context({}, 500);
    await expect(resolveYearToken(failed.ctx, "http://localhost:8787", null)).rejects.toThrow(
      "対象年を /api/media から取れませんでした（500）。",
    );
    const empty = context({ years: [] });
    await expect(resolveYearToken(empty.ctx, "http://localhost:8787", null)).rejects.toThrow(
      "年の一覧が空なので、対象年が決まりません。",
    );
    const blank = context({ years: [{ label: "" }] });
    await expect(resolveYearToken(blank.ctx, "http://localhost:8787", null)).rejects.toThrow(
      "年の一覧が空なので、対象年が決まりません。",
    );
  });
});

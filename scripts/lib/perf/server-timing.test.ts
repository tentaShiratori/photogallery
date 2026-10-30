import type { Page, Response } from "playwright-core";
import { describe, expect, it } from "vite-plus/test";
import { attachServerTimingListener, parseServerTiming } from "./server-timing.ts";

describe("parseServerTiming", () => {
  it("空なら null", () => {
    expect(parseServerTiming(null)).toBeNull();
    expect(parseServerTiming("  ")).toBeNull();
    expect(parseServerTiming("r2;dur=1")).toBeNull();
  });

  it("r2 と total を読む", () => {
    expect(parseServerTiming('R2; desc="4"; dur=12.5, total;dur=30, other;foo')).toEqual({
      r2Calls: 4,
      r2Ms: 12.5,
      totalMs: 30,
    });
    expect(parseServerTiming("r2;dur=nope;desc=abc, total;dur=1")).toBeNull();
    expect(parseServerTiming(", r2;dur=1;desc=2, total;dur=3")).toEqual({ r2Calls: 2, r2Ms: 1, totalMs: 3 });
  });
});

function fakePage() {
  const listeners = new Set<(response: Response) => void>();
  return {
    listeners,
    on(event: string, listener: (response: Response) => void) {
      if (event === "response") listeners.add(listener);
    },
    off(event: string, listener: (response: Response) => void) {
      if (event === "response") listeners.delete(listener);
    },
    emit(response: Response) {
      for (const listener of listeners) listener(response);
    },
  };
}

function response(url: string, header: string | undefined): Response {
  return {
    url: () => url,
    headers: () => (header === undefined ? {} : { "server-timing": header }),
  } as Response;
}

describe("attachServerTimingListener", () => {
  it("year の有無が合う /api/media だけを残す", () => {
    const page = fakePage();
    const timing = attachServerTimingListener(page as unknown as Page, true);
    page.emit(response("https://example.test/api/media", "r2;dur=1;desc=1, total;dur=1"));
    page.emit(response("https://example.test/api/media?year=2024", "r2;dur=9;desc=3, total;dur=10"));
    page.emit(response("not a url", "r2;dur=1;desc=1, total;dur=1"));
    page.emit(response("https://example.test/other", "r2;dur=1;desc=1, total;dur=1"));
    expect(timing.take()).toEqual({ r2Calls: 3, r2Ms: 9, totalMs: 10 });
    page.emit(response("https://example.test/api/media?year=2020", "r2;dur=1;desc=8, total;dur=1"));
    expect(page.listeners.size).toBe(0);
  });

  it("取れなければ year の有無を添えて失敗する", () => {
    const without = attachServerTimingListener(fakePage() as unknown as Page, false);
    expect(() => without.take()).toThrow("Server-Timing を /api/media（year なし）から取れませんでした。");
    const withYear = attachServerTimingListener(fakePage() as unknown as Page, true);
    expect(() => withYear.take()).toThrow("year あり");
  });
});

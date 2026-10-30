import { describe, expect, it } from "vite-plus/test";
import { markYearScreen, waitForYearScreenThumbs } from "./perf";

describe("year-screen/perf", () => {
  it("performance に mark を付ける", () => {
    performance.clearMarks();
    markYearScreen.loading();
    markYearScreen.api();
    markYearScreen.ready();
    expect(performance.getEntriesByName("year-screen-loading").length).toBe(1);
    expect(performance.getEntriesByName("year-screen-api").length).toBe(1);
    expect(performance.getEntriesByName("year-screen-ready").length).toBe(1);
  });

  it("grid ルートのサムネイル待ちを呼ぶ", async () => {
    const root = document.createElement("div");
    root.id = "grid";
    document.body.append(root);
    await expect(waitForYearScreenThumbs()).resolves.toBeUndefined();
    root.remove();
  });
});

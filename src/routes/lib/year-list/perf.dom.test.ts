import { describe, expect, it } from "vite-plus/test";
import { markYearList, waitForYearListThumbs } from "./perf";

describe("year-list/perf", () => {
  it("performance に mark を付ける", () => {
    performance.clearMarks();
    markYearList.loading();
    markYearList.api();
    markYearList.ready();
    expect(performance.getEntriesByName("year-list-loading").length).toBe(1);
    expect(performance.getEntriesByName("year-list-api").length).toBe(1);
    expect(performance.getEntriesByName("year-list-ready").length).toBe(1);
  });

  it("year-list ルートのサムネイル待ちを呼ぶ", async () => {
    const root = document.createElement("div");
    root.id = "year-list";
    document.body.append(root);
    await expect(waitForYearListThumbs()).resolves.toBeUndefined();
    root.remove();
  });
});

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Gallery } from "./client";
import { clearDom, mountDom } from "./dom-test.fixtures.tsx";
import { mediaItem, yearCard } from "./media.fixtures.ts";

describe("Gallery", () => {
  afterEach(() => {
    clearDom();
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の一覧を出し、年を開くと年の画面になる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("year=")) {
          return Response.json({
            group: {
              label: "2024",
              truncated: false,
              items: [mediaItem("2024", 0), mediaItem("2024", 1)],
            },
            next: null,
          });
        }
        return Response.json({ years: [yearCard("2024", 2)] });
      }),
    );
    const root = mountDom(<Gallery />);
    await vi.waitFor(() => {
      expect(root.querySelector("#year-list")?.textContent).toContain("2024");
    });
    root.querySelector("#year-list button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(root.querySelector("#grid")).not.toBeNull();
      expect(root.textContent).toContain("← 年の一覧へ");
    });
    root.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(root.querySelector("#year-list")).not.toBeNull();
    });
  });
});

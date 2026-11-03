import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { renderHook, waitFor } from "@testing-library/react";
import { mediaItem } from "./media.fixtures.ts";
import { useYearFeed } from "./useYearFeed";

describe("useYearFeed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の画面を取得してタイルを出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          group: {
            label: "2024",
            truncated: false,
            items: [mediaItem("2024", 0)],
          },
          next: null,
        }),
      ),
    );
    const { result } = renderHook(() => useYearFeed("2024"));
    await waitFor(() => {
      expect(result.current.screenView.label).toBe("2024");
      expect(result.current.screenView.tiles).toHaveLength(1);
    });
  });

  it("取得失敗時は失敗文言を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const { result } = renderHook(() => useYearFeed("2024"));
    await waitFor(() => {
      expect(result.current.screenView.status).toBe("一覧を取得できませんでした。");
    });
  });
});

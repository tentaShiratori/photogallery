import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { renderHook, waitFor } from "@testing-library/react";
import { yearCard } from "./media.fixtures.ts";
import { resetYearListCache, useYearList } from "./useYearList";

describe("useYearList", () => {
  afterEach(() => {
    resetYearListCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("一覧を取得して年カードを出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          years: [yearCard("2024", 1)],
        }),
      ),
    );
    const { result } = renderHook(() => useYearList());
    expect(result.current.status).toBe("読み込み中です。");
    await waitFor(() => {
      expect(result.current.years.map((card) => card.label)).toEqual(["2024"]);
    });
    expect(result.current.status).toBeNull();
  });

  it("取得失敗時は失敗文言を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const { result } = renderHook(() => useYearList());
    await waitFor(() => {
      expect(result.current.status).toBe("一覧を取得できませんでした。");
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { FC } from "hono/jsx";
import { clearDom, mountDom } from "./dom-test.fixtures.tsx";
import { mediaItem } from "./media.fixtures.ts";
import { useYearFeed } from "./useYearFeed";

const Host: FC<{ yearToken: string | null }> = ({ yearToken }) => {
  const { screenView, sentinel } = useYearFeed(yearToken);
  return (
    <div>
      <span data-testid="status">{screenView.status ?? ""}</span>
      <span data-testid="label">{screenView.label ?? ""}</span>
      <span data-testid="tiles">{String(screenView.tiles.length)}</span>
      <div ref={sentinel} id="sentinel" />
    </div>
  );
};

describe("useYearFeed", () => {
  afterEach(() => {
    clearDom();
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
    const root = mountDom(<Host yearToken="2024" />);
    await vi.waitFor(() => {
      expect(root.querySelector("[data-testid=label]")?.textContent).toBe("2024");
      expect(root.querySelector("[data-testid=tiles]")?.textContent).toBe("1");
    });
  });

  it("yearToken が null ならリセットする", async () => {
    const root = mountDom(<Host yearToken={null} />);
    await Promise.resolve();
    expect(root.querySelector("[data-testid=status]")?.textContent).toBe("読み込み中です。");
    expect(root.querySelector("[data-testid=tiles]")?.textContent).toBe("0");
  });

  it("取得失敗時は失敗文言を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const root = mountDom(<Host yearToken="2024" />);
    await vi.waitFor(() => {
      expect(root.querySelector("[data-testid=status]")?.textContent).toBe("一覧を取得できませんでした。");
    });
  });
});

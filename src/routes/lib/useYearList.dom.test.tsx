import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { FC } from "hono/jsx";
import { clearDom, mountDom } from "./dom-test.fixtures.tsx";
import { yearCard } from "./media.fixtures.ts";
import { useYearList } from "./useYearList";

const Host: FC<{ yearToken: string | null }> = ({ yearToken }) => {
  const view = useYearList(yearToken);
  return (
    <div>
      <span data-testid="status">{view.status ?? ""}</span>
      <span data-testid="years">{view.years.map((card) => card.label).join(",")}</span>
    </div>
  );
};

describe("useYearList", () => {
  afterEach(() => {
    clearDom();
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
    const root = mountDom(<Host yearToken={null} />);
    expect(root.querySelector("[data-testid=status]")?.textContent).toBe("読み込み中です。");
    await vi.waitFor(() => {
      expect(root.querySelector("[data-testid=years]")?.textContent).toBe("2024");
    });
    expect(root.querySelector("[data-testid=status]")?.textContent).toBe("");
  });

  it("取得失敗時は失敗文言を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const root = mountDom(<Host yearToken={null} />);
    await vi.waitFor(() => {
      expect(root.querySelector("[data-testid=status]")?.textContent).toBe("一覧を取得できませんでした。");
    });
  });
});

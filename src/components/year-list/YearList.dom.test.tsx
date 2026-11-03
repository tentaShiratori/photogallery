import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { screen } from "@testing-library/react";
import { yearCard } from "../media.fixtures.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { resetYearListCache } from "../useYearList";
import { YearList } from "./YearList";

describe("YearList", () => {
  afterEach(() => {
    resetYearListCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の一覧をリンク付きで出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ years: [yearCard("2024", 2)] })),
    );
    renderWithRouter(<YearList />);
    const link = await screen.findByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });
});

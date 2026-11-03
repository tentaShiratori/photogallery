import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { createRouterWrapper } from "../../../test/wrapper/router.tsx";
import { yearCard } from "../media.fixtures.ts";
import { YearList } from "./YearList";
import { YearListProvider } from "./YearListContext";

describe("YearList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の一覧をリンク付きカードで出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ years: [yearCard("2024", 2)] })),
    );
    render(
      <YearListProvider>
        <YearList />
      </YearListProvider>,
      { wrapper: createRouterWrapper() },
    );
    const link = await screen.findByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });
});

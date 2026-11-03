import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mediaItem } from "../media.fixtures.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { YearScreen } from "./YearScreen";

describe("YearScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の画面を出し、年の一覧へ戻るリンクがある", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          group: {
            label: "2024",
            truncated: false,
            items: [mediaItem("2024", 0), mediaItem("2024", 1)],
          },
          next: null,
        }),
      ),
    );
    renderWithRouter(<YearScreen yearToken="2024" />, "/years/2024");
    expect(await screen.findByRole("link", { name: "← 年の一覧へ" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2024-0.jpg" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "← 年の一覧へ" }));
  });
});

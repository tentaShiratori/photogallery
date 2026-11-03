import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mediaItem } from "../media.fixtures.ts";
import { YearScreen } from "./YearScreen";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={String(to)} {...rest}>
      {children}
    </a>
  ),
}));

describe("YearScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の画面と一覧へのリンクを出す", async () => {
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
    render(<YearScreen yearToken="2024" />);
    const back = await screen.findByRole("link", { name: "← 年の一覧へ" });
    expect(back.getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: "2024-0.jpg" })).toBeTruthy();
  });

  it("タイルを選ぶと拡大表示が開く", async () => {
    const user = userEvent.setup();
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
    render(<YearScreen yearToken="2024" />);
    await user.click(await screen.findByRole("button", { name: "2024-0.jpg" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

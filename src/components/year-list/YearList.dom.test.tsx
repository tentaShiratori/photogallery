import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { yearCard } from "../media.fixtures.ts";
import { YearList } from "./YearList";
import { YearListProvider } from "./YearListContext";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: { year: string };
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={params ? `/years/${params.year}` : String(to)} {...rest}>
      {children}
    </a>
  ),
}));

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
    );
    const link = await screen.findByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });
});

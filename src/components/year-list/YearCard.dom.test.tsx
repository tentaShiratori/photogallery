import { describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { yearCard } from "../media.fixtures.ts";
import { YearCard } from "./YearCard";

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

describe("YearCard", () => {
  it("年ラベルを出し、年の画面へのリンクになる", () => {
    render(<YearCard card={yearCard("2024", 2)} />);
    const link = screen.getByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });

  it("年不明は unknown へのリンクになる", () => {
    render(<YearCard card={yearCard("年不明", 1)} />);
    const link = screen.getByRole("link", { name: "年不明" });
    expect(link.getAttribute("href")).toBe("/years/unknown");
  });
});

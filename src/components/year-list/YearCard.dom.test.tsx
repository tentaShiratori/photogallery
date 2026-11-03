import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { createRouterWrapper } from "../../../test/wrapper/router.tsx";
import { yearCard } from "../media.fixtures.ts";
import { YearCard } from "./YearCard";

describe("YearCard", () => {
  it("年ラベルを出し、年の画面へのリンクになる", () => {
    render(<YearCard card={yearCard("2024", 2)} />, { wrapper: createRouterWrapper() });
    const link = screen.getByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });

  it("年不明は unknown へのリンクになる", () => {
    render(<YearCard card={yearCard("年不明", 1)} />, { wrapper: createRouterWrapper() });
    const link = screen.getByRole("link", { name: "年不明" });
    expect(link.getAttribute("href")).toBe("/years/unknown");
  });
});

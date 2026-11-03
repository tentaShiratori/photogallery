import { describe, expect, it } from "vite-plus/test";
import { screen } from "@testing-library/react";
import { yearCard } from "../media.fixtures.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { YearCard } from "./YearCard";

describe("YearCard", () => {
  it("年ラベルを出し、年の画面へのリンクになる", async () => {
    renderWithRouter(<YearCard card={yearCard("2024", 2)} />);
    const link = await screen.findByRole("link", { name: "2024" });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });

  it("年不明は unknown パスへのリンクになる", async () => {
    renderWithRouter(<YearCard card={yearCard("年不明", 1)} />);
    const link = await screen.findByRole("link", { name: "年不明" });
    expect(link.getAttribute("href")).toBe("/years/unknown");
  });
});

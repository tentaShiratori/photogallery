import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { yearCard } from "../media.fixtures.ts";
import { YearCard } from "./YearCard";

describe("YearCard", () => {
  it("年ラベルを出し、クリックでトークンを渡す", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];
    render(<YearCard card={yearCard("2024", 2)} onOpen={(token) => opened.push(token)} />);
    const button = screen.getByRole("button", { name: "2024" });
    expect(button).toBeTruthy();
    await user.click(button);
    expect(opened).toEqual(["2024"]);
  });

  it("年不明は unknown を渡す", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];
    render(<YearCard card={yearCard("年不明", 1)} onOpen={(token) => opened.push(token)} />);
    await user.click(screen.getByRole("button", { name: "年不明" }));
    expect(opened).toEqual(["unknown"]);
  });
});

import { afterEach, describe, expect, it } from "vite-plus/test";
import { clearDom, mountDom } from "../dom-test.fixtures.tsx";
import { yearCard } from "../media.fixtures.ts";
import { YearCard } from "./YearCard";

describe("YearCard", () => {
  afterEach(() => {
    clearDom();
  });

  it("年ラベルを出し、クリックでトークンを渡す", () => {
    const opened: string[] = [];
    const root = mountDom(<YearCard card={yearCard("2024", 2)} onOpen={(token) => opened.push(token)} />);
    expect(root.textContent).toContain("2024");
    root.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(opened).toEqual(["2024"]);
  });

  it("年不明は unknown を渡す", () => {
    const opened: string[] = [];
    const root = mountDom(<YearCard card={yearCard("年不明", 1)} onOpen={(token) => opened.push(token)} />);
    root.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(opened).toEqual(["unknown"]);
  });
});

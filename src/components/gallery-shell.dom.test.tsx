import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { GalleryShell } from "./gallery-shell";

describe("GalleryShell", () => {
  it("見出しとメールを出す", () => {
    render(
      <GalleryShell email="a@example.com">
        <span>中身</span>
      </GalleryShell>,
    );
    expect(screen.getByRole("heading", { name: "フォトギャラリー" })).toBeTruthy();
    expect(screen.getByText("a@example.com")).toBeTruthy();
    expect(screen.getByText("中身")).toBeTruthy();
  });

  it("メールが無いときはローカルプレビューと出す", () => {
    render(
      <GalleryShell email={null}>
        <span>中身</span>
      </GalleryShell>,
    );
    expect(screen.getByText("ローカルプレビュー")).toBeTruthy();
  });
});

import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { GalleryChrome } from "../routes/index.tsx";

describe("GalleryChrome", () => {
  it("認証メールをテキストとして出す", () => {
    render(<GalleryChrome email={"<img src=x onerror=alert(1)>@example.com"}>{null}</GalleryChrome>);
    expect(screen.getByText("<img src=x onerror=alert(1)>@example.com")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("メールが無いときはローカルプレビューと出す", () => {
    render(<GalleryChrome email={null}>{null}</GalleryChrome>);
    expect(screen.getByRole("heading", { name: "フォトギャラリー" })).toBeTruthy();
    expect(screen.getByText("ローカルプレビュー")).toBeTruthy();
  });
});

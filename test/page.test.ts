import { describe, expect, it } from "vite-plus/test";
import { galleryPage } from "../src/page.ts";

describe("galleryPage", () => {
  it("認証メールをエスケープして出す", () => {
    const html = galleryPage(`<img src=x onerror=alert(1)>@example.com`);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x");
  });

  it("メールが無いときはローカルプレビューと出す", () => {
    expect(galleryPage(null)).toContain("ローカルプレビュー");
  });
});

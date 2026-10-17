import { describe, expect, it } from "vite-plus/test";
import { GalleryContent } from "../src/page.tsx";

describe("GalleryContent", () => {
  it("認証メールをエスケープして出す", () => {
    const html = (<GalleryContent email="<img src=x onerror=alert(1)>@example.com" />).toString();
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x onerror");
  });

  it("メールが無いときはローカルプレビューと出す", () => {
    const html = (<GalleryContent email={null} />).toString();
    expect(html).toContain("ローカルプレビュー");
  });
});

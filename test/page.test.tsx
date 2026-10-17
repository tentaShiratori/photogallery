import { describe, expect, it } from "vite-plus/test";
import { GalleryContent } from "../src/page.tsx";

function renderToString(element: unknown): string {
  return String(element);
}

describe("GalleryContent", () => {
  it("認証メールをエスケープして出す", () => {
    const html = renderToString(<GalleryContent email="<img src=x onerror=alert(1)>@example.com" />);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x onerror");
  });

  it("メールが無いときはローカルプレビューと出す", () => {
    const html = renderToString(<GalleryContent email={null} />);
    expect(html).toContain("ローカルプレビュー");
  });
});

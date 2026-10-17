import { describe, expect, it } from "vite-plus/test";
import { GalleryContent } from "./index.tsx";

async function renderToString(element: { toString(): string | Promise<string> }): Promise<string> {
  const html = await element.toString();
  return html.toString();
}

describe("GalleryContent", () => {
  it("認証メールをエスケープして出す", async () => {
    const html = await renderToString(
      <GalleryContent email="<img src=x onerror=alert(1)>@example.com" />,
    );
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x onerror");
  });

  it("メールが無いときはローカルプレビューと出す", async () => {
    const html = await renderToString(<GalleryContent email={null} />);
    expect(html).toContain("ローカルプレビュー");
  });
});

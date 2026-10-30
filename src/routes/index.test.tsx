import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import type { Env } from "../lib/types.ts";
import { renderer } from "../renderer.tsx";
import { GalleryContent, getIndex } from "./index.tsx";

async function renderToString(element: { toString(): string | Promise<string> }): Promise<string> {
  const html = await element.toString();
  return html.toString();
}

describe("GalleryContent", () => {
  it("認証メールをエスケープして出す", async () => {
    const html = await renderToString(<GalleryContent email="<img src=x onerror=alert(1)>@example.com" />);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x onerror");
  });

  it("メールが無いときはローカルプレビューと出す", async () => {
    const html = await renderToString(<GalleryContent email={null} />);
    expect(html).toContain("ローカルプレビュー");
  });
});

describe("getIndex", () => {
  function request(email?: string) {
    const app = new Hono<{ Bindings: Env }>();
    app.use(renderer);
    app.get("/", getIndex);
    const headers = email ? { "Cf-Access-Authenticated-User-Email": email } : undefined;
    return app.request("/", { headers });
  }

  it("Cf-Access のメールを出す", async () => {
    const res = await request("ada@example.com");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("ada@example.com");
    expect(html).toContain("フォトギャラリー");
  });

  it("メールが無ければローカルプレビューと出す", async () => {
    const html = await (await request()).text();
    expect(html).toContain("ローカルプレビュー");
  });
});

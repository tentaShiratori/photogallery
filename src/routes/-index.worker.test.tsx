import { describe, expect, it } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";

describe("GET /", () => {
  it("認証メールをテキストとして出す", async () => {
    const response = await loadServerResponse(
      new Request("http://localhost/", {
        headers: { "Cf-Access-Authenticated-User-Email": "<img src=x onerror=alert(1)>@example.com" },
      }),
    );
    const html = await response.text();
    // React escapes text content, so the raw tags must not appear as HTML.
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;@example.com");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("ローカルプレビュー");
  });

  it("メールが無いときはローカルプレビューと出す", async () => {
    const response = await loadServerResponse(new Request("http://localhost/"));
    const html = await response.text();
    expect(html).toContain("ローカルプレビュー");
  });

  it("古いクエリは /years/ へ置き換える", async () => {
    const response = await loadServerResponse(new Request("http://localhost/?year=2024"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/years/2024");
  });
});

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

  it("?year= は /years/ へ置き換えリダイレクトする", async () => {
    const response = await loadServerResponse(new Request("http://localhost/?year=2024"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/years/2024");
  });
});

describe("GET /years/$year", () => {
  it("年の画面を出す", async () => {
    const response = await loadServerResponse(new Request("http://localhost/years/2024"));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("フォトギャラリー");
    expect(html).toContain("ローカルプレビュー");
  });

  it("不正な年は 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/years/abc"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });

  it("0 の年は 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/years/0"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });
});

describe("未知の場所", () => {
  it("存在しないパスは 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/no/such"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });
});

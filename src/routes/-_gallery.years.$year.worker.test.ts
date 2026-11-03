import { describe, expect, it } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";

describe("GET /years/$year", () => {
  it("年の画面を出す", async () => {
    const response = await loadServerResponse(new Request("http://localhost/years/2024"));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("フォトギャラリー");
  });

  it("不正な年は 404", async () => {
    const bad = await loadServerResponse(new Request("http://localhost/years/abc"));
    expect(bad.status).toBe(404);
    expect(await bad.text()).toContain("見つかりません。");

    const zero = await loadServerResponse(new Request("http://localhost/years/0"));
    expect(zero.status).toBe(404);
    expect(await zero.text()).toContain("見つかりません。");
  });
});

describe("未知の場所と古い year クエリ", () => {
  it("未知の場所は 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/no-such-path"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });

  it("/?year=2024 は /years/2024 へリダイレクトする", async () => {
    const response = await loadServerResponse(new Request("http://localhost/?year=2024"));
    expect([301, 302, 303, 307, 308]).toContain(response.status);
    expect(response.headers.get("location")).toBe("/years/2024");
  });
});

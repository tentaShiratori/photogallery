import { describe, expect, it } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";

describe("GET /years/$year", () => {
  it("有効な年は年の画面の枠を出す", async () => {
    const response = await loadServerResponse(new Request("http://localhost/years/2024"));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("フォトギャラリー");
    expect(html).toContain("ローカルプレビュー");
  });

  it("不正な年は 404", async () => {
    for (const year of ["abc", "0", "0123"]) {
      const response = await loadServerResponse(new Request(`http://localhost/years/${year}`));
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("見つかりません。");
    }
  });
});

describe("GET /?year=", () => {
  it("古いクエリは /years/ へ置き換える", async () => {
    const response = await loadServerResponse(new Request("http://localhost/?year=2024"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/years/2024");
  });
});

describe("未知の場所", () => {
  it("存在しないパスは 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/no-such-page"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });
});

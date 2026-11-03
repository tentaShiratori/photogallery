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

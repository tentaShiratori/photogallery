import { describe, expect, it } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";

describe("未知の場所", () => {
  it("存在しないパスは 404", async () => {
    const response = await loadServerResponse(new Request("http://localhost/no-such-page"));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("見つかりません。");
  });
});

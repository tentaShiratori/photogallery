import { describe, expect, it } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";

describe("GET /hoge", () => {
  it("returns photos", async () => {
    const response = await loadServerResponse(new Request("http://localhost/hoge"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hoge: "hoge" });
  });
});

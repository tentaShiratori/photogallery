import { describe, expect, it } from "vite-plus/test";
import app from "./index.tsx";

describe("notFound", () => {
  it("未知のパスは 404", async () => {
    const res = await app.request("/no-such");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("見つかりません。");
  });
});

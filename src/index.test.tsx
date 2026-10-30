import { describe, expect, it } from "vite-plus/test";
import app from "./index.tsx";

describe("app", () => {
  it("未知のパスは 404", async () => {
    const res = await app.request("/no-such");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("見つかりません。");
  });

  it("favicon とトップをルートに結ぶ", async () => {
    const icon = await app.request("/favicon.svg");
    expect(icon.status).toBe(200);
    expect(icon.headers.get("content-type")).toContain("image/svg+xml");
    const home = await app.request("/", {
      headers: { "Cf-Access-Authenticated-User-Email": "ada@example.com" },
    });
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("ada@example.com");
  });
});

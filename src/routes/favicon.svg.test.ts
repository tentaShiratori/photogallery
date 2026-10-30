import { describe, expect, it } from "vite-plus/test";
import { getFavicon } from "./favicon.svg.ts";

describe("getFavicon", () => {
  it("SVG を image/svg+xml で返す", async () => {
    const res = getFavicon();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("</svg>");
  });
});

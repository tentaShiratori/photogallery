import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { loadServerResponse } from "../../test/router";
import { env } from "cloudflare:workers";

const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const key = "2024-08-02T12-00-00.jpg";

beforeAll(async () => {
  await env.MEDIA.put(key, new Blob([bytes]));
});
describe("serveObject", () => {
  it("無いキーは 404", async () => {
    const res = await loadServerResponse(new Request("http://localhost/media/missing.jpg"));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("見つかりません。");
  });

  it("対応していない拡張子のパスは 404", async () => {
    await env.MEDIA.put("missing.txt", new Blob([bytes]));
    const res = await loadServerResponse(new Request("http://localhost/media/missing.txt"));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("見つかりません。");
  });

  it("フォルダ付きのキーを返す", async () => {
    await env.MEDIA.put("t/2024-08-02T12-00-00.webp", new Blob([bytes]));
    const res = await loadServerResponse(new Request("http://localhost/media/t/2024-08-02T12-00-00.webp"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("etag")).toBeDefined();
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("Content-Type が無ければ拡張子から付け、あればそれを残す", async () => {
    const plain = await loadServerResponse(new Request(`http://localhost/media/${key}`));
    expect(plain.status).toBe(200);
    expect(plain.headers.get("content-type")).toBe("image/jpeg");
    expect(plain.headers.get("etag")).toBeDefined();
    expect(plain.headers.get("accept-ranges")).toBe("bytes");
    expect(plain.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(new Uint8Array(await plain.arrayBuffer())).toEqual(bytes);

    await env.MEDIA.put(key, new Blob([bytes]), { httpMetadata: { contentType: "image/png" } });
    const typed = await loadServerResponse(new Request(`http://localhost/media/${key}`));
    expect(typed.headers.get("content-type")).toBe("image/png");
  });

  it("Range があれば 206 と Content-Range", async () => {
    const res = await loadServerResponse(
      new Request(`http://localhost/media/${key}`, { headers: { Range: "bytes=2-5" } }),
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([2, 3, 4, 5]));
  });
});

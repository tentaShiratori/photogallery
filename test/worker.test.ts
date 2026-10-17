import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vite-plus/test";

const SAMPLE_IMAGE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

const SAMPLE_VIDEO = new Uint8Array(1024);
for (let i = 0; i < SAMPLE_VIDEO.length; i++) {
  SAMPLE_VIDEO[i] = i % 256;
}

describe("Worker 統合テスト", () => {
  beforeAll(async () => {
    await env.MEDIA.put("test-image.png", SAMPLE_IMAGE, {
      httpMetadata: { contentType: "image/png" },
    });
    await env.MEDIA.put("test-video.mp4", SAMPLE_VIDEO, {
      httpMetadata: { contentType: "video/mp4" },
    });
    await env.MEDIA.put("folder/nested.jpg", SAMPLE_IMAGE, {
      httpMetadata: { contentType: "image/jpeg" },
    });
  });

  describe("GET /", () => {
    it("ギャラリーページを返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")?.toLowerCase()).toBe("text/html; charset=utf-8");

      const html = await response.text();
      expect(html).toContain("フォトギャラリー");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('id="hono-css"');
      expect(html).toContain("--bg:#f4f1ea");
    });
  });

  describe("GET /api/media", () => {
    it("メディア一覧を JSON で返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = (await response.json()) as { items: unknown[]; truncated: boolean };
      expect(data.truncated).toBe(false);
      expect(data.items.length).toBe(3);
    });

    it("一覧の各アイテムに必要なフィールドがある", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media"));
      const data = (await response.json()) as {
        items: {
          key: string;
          kind: "image" | "video";
          size: number;
          uploaded: string;
          url: string;
        }[];
      };

      for (const item of data.items) {
        expect(item.key).toBeDefined();
        expect(item.kind).toMatch(/^(image|video)$/);
        expect(typeof item.size).toBe("number");
        expect(item.uploaded).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(item.url).toMatch(/^\/media\//);
      }
    });
  });

  describe("GET /media/*", () => {
    it("画像を返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/test-image.png"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("accept-ranges")).toBe("bytes");

      const body = new Uint8Array(await response.arrayBuffer());
      expect(body).toEqual(SAMPLE_IMAGE);
    });

    it("動画を返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/test-video.mp4"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("video/mp4");
      expect(response.headers.get("accept-ranges")).toBe("bytes");
    });

    it("Range リクエストで 206 を返す", async () => {
      const request = new Request("http://localhost/media/test-video.mp4", {
        headers: { Range: "bytes=0-99" },
      });
      const response = await exports.default.fetch(request);

      expect(response.status).toBe(206);
      expect(response.headers.get("content-range")).toBe("bytes 0-99/1024");
      expect(response.headers.get("accept-ranges")).toBe("bytes");

      const body = new Uint8Array(await response.arrayBuffer());
      expect(body.length).toBe(100);
    });

    it("Range リクエストで suffix を返す", async () => {
      const request = new Request("http://localhost/media/test-video.mp4", {
        headers: { Range: "bytes=-50" },
      });
      const response = await exports.default.fetch(request);

      expect(response.status).toBe(206);
      expect(response.headers.get("content-range")).toBe("bytes 974-1023/1024");

      const body = new Uint8Array(await response.arrayBuffer());
      expect(body.length).toBe(50);
    });

    it("ネストされたパスのメディアを返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/folder/nested.jpg"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    it("存在しないファイルで 404 を返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/not-found.png"),
      );
      expect(response.status).toBe(404);
    });

    it("非対応の拡張子で 404 を返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/document.txt"),
      );
      expect(response.status).toBe(404);
    });
  });

  describe("不明なパス", () => {
    it("404 を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/unknown"));
      expect(response.status).toBe(404);
    });
  });
});

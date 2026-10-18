import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import type { MediaItem, MediaList } from "../src/lib/gallery";
import { jpegExif, macSeconds, mp4 } from "./capture-fixtures";

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
    await env.MEDIA.put("dated-2024.jpg", jpegExif("2024:08:02 12:00:00"), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.MEDIA.put(
      "dated-2023.mp4",
      mp4({
        creationSeconds: macSeconds(2023, 5, 1, 8, 30, 0),
        moov: "after-mdat",
        wideMdat: true,
      }).bytes,
      { httpMetadata: { contentType: "video/mp4" } },
    );
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

      const data = (await response.json()) as MediaList & { items?: unknown };
      expect(data.truncated).toBe(false);
      expect(Object.hasOwn(data, "items")).toBe(false);
      expect(data.groups.map((group) => group.label)).toEqual(["2024", "2023", "年不明"]);

      const jpeg = data.groups[0]?.items.find((item) => item.key === "dated-2024.jpg");
      expect(jpeg?.captured).toEqual({
        year: 2024,
        month: 8,
        day: 2,
        hour: 12,
        minute: 0,
        second: 0,
      });
      const video = data.groups[1]?.items.find((item) => item.key === "dated-2023.mp4");
      expect(video?.captured).toEqual({
        year: 2023,
        month: 5,
        day: 1,
        hour: 8,
        minute: 30,
        second: 0,
      });
      const unknown = data.groups.find((group) => group.year === null);
      expect(unknown?.label).toBe("年不明");
      expect(unknown?.items.map((item) => item.key).sort()).toEqual([
        "folder/nested.jpg",
        "test-image.png",
        "test-video.mp4",
      ]);
      expect(unknown?.items.every((item) => item.captured === null)).toBe(true);
    });

    it("一覧の各アイテムに必要なフィールドがある", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media"));
      const data = (await response.json()) as MediaList;
      const items: MediaItem[] = [];
      for (const group of data.groups) {
        if (group.year === null) items.push(...group.items);
        else items.push(...group.items);
      }

      expect(items).toHaveLength(5);
      for (const item of items) {
        expect(item.key).toBeDefined();
        expect(item.kind).toMatch(/^(image|video)$/);
        expect(typeof item.size).toBe("number");
        expect(item.uploaded).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(item.url).toMatch(/^\/media\//);
        if (item.captured) {
          expect(item.captured.year).toBeGreaterThan(0);
        } else {
          expect(item.captured).toBeNull();
        }
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

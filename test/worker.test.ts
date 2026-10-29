import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import app from "../src/index";
import type { YearListResponse, YearScreenResponse } from "../src/routes/api/media";
import { jpegExif, macSeconds, mp4 } from "./capture-fixtures";

function withList(bucket: R2Bucket, list: R2Bucket["list"]): R2Bucket {
  return new Proxy(bucket, {
    get: (target, property) => (property === "list" ? list : Reflect.get(target, property)),
  });
}

function fetchWith(bucket: R2Bucket, path: string): Promise<Response> {
  return Promise.resolve(app.fetch(new Request(`http://localhost${path}`), { ...env, MEDIA: bucket }));
}

const SAMPLE_THUMB = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00,
  0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
]);

const SAMPLE_IMAGE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
  0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
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
    await env.MEDIA.put("2022-01-01T00-00-00.jpg", SAMPLE_IMAGE, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.MEDIA.put("t/2019-01-01T00-00-00.webp", SAMPLE_THUMB, {
      httpMetadata: { contentType: "image/webp" },
    });
    await env.MEDIA.put("2024-08-02T12-00-00.jpg", jpegExif("2024:08:02 12:00:00"), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.MEDIA.put("t/2024-08-02T12-00-00.webp", SAMPLE_THUMB, {
      httpMetadata: { contentType: "image/webp" },
    });
    for (const key of [
      "2024-01-02T08-00-00.jpg",
      "2024-03-01T00-00-00.jpg",
      "2024-09-01T00-00-00.jpg",
      "2024-12-02T08-00-00.jpg",
    ]) {
      const stem = key.slice(0, key.lastIndexOf("."));
      await env.MEDIA.put(key, SAMPLE_IMAGE, { httpMetadata: { contentType: "image/jpeg" } });
      await env.MEDIA.put(`t/${stem}.webp`, SAMPLE_THUMB, {
        httpMetadata: { contentType: "image/webp" },
      });
    }
    await env.MEDIA.put(
      "2023-05-01T08-30-00.mp4",
      mp4({
        creationSeconds: macSeconds(2023, 5, 1, 8, 30, 0),
        moov: "after-mdat",
        wideMdat: true,
      }).bytes,
      { httpMetadata: { contentType: "video/mp4" } },
    );
    await env.MEDIA.put("t/2023-05-01T08-30-00.webp", SAMPLE_THUMB, {
      httpMetadata: { contentType: "image/webp" },
    });
    await env.MEDIA.put("u-abc123def456.png", SAMPLE_IMAGE, {
      httpMetadata: { contentType: "image/png" },
    });
    await env.MEDIA.put("t/u-abc123def456.webp", SAMPLE_THUMB, {
      httpMetadata: { contentType: "image/webp" },
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
      expect(html).toContain('rel="icon"');
      expect(html).toContain('type="image/svg+xml"');
      expect(html).toContain('href="/favicon.svg"');
    });
  });

  describe("GET /favicon.svg", () => {
    it("タブの印を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/favicon.svg"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")?.toLowerCase()).toBe("image/svg+xml; charset=utf-8");
      expect(response.headers.get("cache-control")).toBe("private, max-age=3600");

      const body = await response.text();
      expect(body).toContain("<svg");
      expect(body.match(/<use\b/g)?.length).toBe(8);
      expect(body).not.toContain("見つかりません。");
      expect(body).not.toContain("<text");
      expect(body).not.toContain("<image");
    });
  });

  describe("GET /api/media", () => {
    it("一覧は新しい年からカードを返し、プレビューは名前の昇順で最大 4 件", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      const serverTiming = response.headers.get("server-timing");
      expect(serverTiming).toMatch(/^r2;desc="\d+";dur=\d+(\.\d+)?, total;dur=\d+(\.\d+)?$/);
      const r2Desc = /r2;desc="(\d+)"/.exec(serverTiming ?? "");
      expect(Number(r2Desc?.[1])).toBeGreaterThan(0);

      const list = (await response.json()) as YearListResponse;
      expect(Object.keys(list).sort()).toEqual(["years"]);
      expect(list.years.map((year) => year.label)).toEqual(["2024", "2023", "年不明"]);
      expect(list.years[0]?.previews.map((item) => item.bodyKey)).toEqual([
        "2024-01-02T08-00-00.jpg",
        "2024-03-01T00-00-00.jpg",
        "2024-08-02T12-00-00.jpg",
        "2024-09-01T00-00-00.jpg",
      ]);
      expect(list.years[1]?.previews[0]?.bodyKey).toBe("2023-05-01T08-30-00.mp4");
      expect(list.years[2]?.previews[0]?.bodyKey).toBe("u-abc123def456.png");
    });

    it("year で 1 年分を今と同じ順で返し next は null", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media?year=2024"));
      expect(response.status).toBe(200);
      expect(response.headers.get("server-timing")).toBeNull();
      const page = (await response.json()) as YearScreenResponse;
      expect(page.next).toBeNull();
      expect(page.group?.label).toBe("2024");
      expect(page.group?.truncated).toBe(false);
      expect(page.group?.items.map((item) => item.bodyKey)).toEqual([
        "2024-12-02T08-00-00.jpg",
        "2024-09-01T00-00-00.jpg",
        "2024-08-02T12-00-00.jpg",
        "2024-03-01T00-00-00.jpg",
        "2024-01-02T08-00-00.jpg",
      ]);
    });

    it("year=unknown で年不明を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/api/media?year=unknown"));
      expect(response.status).toBe(200);
      const page = (await response.json()) as YearScreenResponse;
      expect(page.group?.label).toBe("年不明");
      expect(page.next).toBeNull();
    });

    it("year が不正だと 400 と日本語の本文", async () => {
      for (const year of ["abc", "0", "2024x", ""]) {
        const response = await exports.default.fetch(new Request(`http://localhost/api/media?year=${year}`));
        expect(response.status).toBe(400);
        expect(await response.text()).toBe("year が不正です。");
      }
    });

    it("年を探す一覧が上限を超えると 500 を返す", async () => {
      const response = await fetchWith(
        withList(env.MEDIA, async (options) =>
          options?.delimiter === undefined
            ? env.MEDIA.list(options)
            : { objects: [], delimitedPrefixes: ["1000-"], truncated: true, cursor: "more" },
        ),
        "/api/media",
      );
      expect(response.status).toBe(500);
    });
  });

  describe("GET /media/*", () => {
    it("画像を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/test-image.png"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("accept-ranges")).toBe("bytes");

      const body = new Uint8Array(await response.arrayBuffer());
      expect(body).toEqual(SAMPLE_IMAGE);
    });

    it("動画を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/test-video.mp4"));
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

    it("サムネイルキーのバイトを返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/t/2024-08-02T12-00-00.webp"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/webp");
      const body = new Uint8Array(await response.arrayBuffer());
      expect(body).toEqual(SAMPLE_THUMB);
    });

    it("ネストされたパスのメディアを返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/folder/nested.jpg"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    it("存在しないファイルで 404 を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/not-found.png"));
      expect(response.status).toBe(404);
    });

    it("非対応の拡張子で 404 を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/media/document.txt"));
      expect(response.status).toBe(404);
    });
  });

  describe("不明なパス", () => {
    it("404 を返す", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/unknown"));
      expect(response.status).toBe(404);
    });

    it("/favicon.ico は 404 で見つかりません。", async () => {
      const response = await exports.default.fetch(new Request("http://localhost/favicon.ico"));
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("見つかりません。");
    });
  });
});

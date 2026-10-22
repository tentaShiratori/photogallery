import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import app from "../src/index";
import type { MediaPage } from "../src/routes/api/media";
import { jpegExif, macSeconds, mp4 } from "./capture-fixtures";

function withList(bucket: R2Bucket, list: R2Bucket["list"]): R2Bucket {
  return new Proxy(bucket, {
    get: (target, property) => (property === "list" ? list : Reflect.get(target, property)),
  });
}

function fetchWith(bucket: R2Bucket, path: string): Promise<Response> {
  return Promise.resolve(
    app.fetch(new Request(`http://localhost${path}`), { ...env, MEDIA: bucket }),
  );
}

const SAMPLE_THUMB = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
]);

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
    });
  });

  describe("GET /api/media", () => {
    it("最初の応答は一番新しい年の本体とサムネイルだけを読む", async () => {
      const calls: R2ListOptions[] = [];
      const response = await fetchWith(
        withList(env.MEDIA, (options) => {
          calls.push(options ?? {});
          return env.MEDIA.list(options);
        }),
        "/api/media",
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("private, no-store");

      const page = (await response.json()) as MediaPage;
      expect(Object.keys(page).sort()).toEqual(["group", "next"]);
      expect(page.group?.label).toBe("2024");
      expect(page.group?.truncated).toBe(false);
      expect(page.next).toBe("/api/media?after=2024");
      const listed = calls.filter((call) => call.delimiter === undefined);
      expect(new Set(listed.map((call) => call.prefix))).toEqual(new Set(["2024-", "t/2024-"]));
      expect(calls.filter((call) => call.delimiter !== undefined).length).toBeGreaterThan(0);
    });

    it("next をたどると年ごとに今と同じ順で全部出る", async () => {
      const steps: [string | null, string | null][] = [];
      const items: NonNullable<MediaPage["group"]>["items"][number][] = [];
      let href: string | null = "/api/media";
      while (href !== null) {
        const response = await exports.default.fetch(new Request(`http://localhost${href}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        const page = (await response.json()) as MediaPage;
        steps.push([page.group?.label ?? null, page.next]);
        items.push(...(page.group?.items ?? []));
        href = page.next;
      }
      expect(steps).toEqual([
        ["2024", "/api/media?after=2024"],
        ["2023", "/api/media?after=2023"],
        [null, "/api/media?after=2022"],
        ["年不明", null],
      ]);
      expect(items.map((item) => item.bodyKey)).toEqual([
        "2024-08-02T12-00-00.jpg",
        "2023-05-01T08-30-00.mp4",
        "u-abc123def456.png",
      ]);
      expect(items.map((item) => item.kind)).toEqual(["image", "video", "image"]);
      for (const item of items) {
        expect(item.bodyUrl).toBe(`/media/${item.bodyKey}`);
        expect(item.thumbUrl).toBe(
          `/media/t/${item.bodyKey.slice(0, item.bodyKey.lastIndexOf("."))}.webp`,
        );
        expect(item.caption).toBe(item.bodyKey);
        expect(Object.keys(item).sort()).toEqual([
          "bodyKey",
          "bodyUrl",
          "caption",
          "kind",
          "thumbUrl",
        ]);
      }
    });

    it("after が年でないと 400 を返す", async () => {
      for (const after of ["abc", "0", "2024x", ""]) {
        const response = await exports.default.fetch(
          new Request(`http://localhost/api/media?after=${after}`),
        );
        expect(response.status).toBe(400);
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

    it("サムネイルキーのバイトを返す", async () => {
      const response = await exports.default.fetch(
        new Request("http://localhost/media/t/2024-08-02T12-00-00.webp"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/webp");
      const body = new Uint8Array(await response.arrayBuffer());
      expect(body).toEqual(SAMPLE_THUMB);
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

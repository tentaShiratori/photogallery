import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import type { Env } from "../lib/types.ts";
import { getMedia, serveObject } from "./media.ts";

type Stored = {
  readonly bytes: Uint8Array;
  readonly contentType?: string;
  readonly range?: R2Range | null;
};

function bucketOf(objects: ReadonlyMap<string, Stored>): R2Bucket {
  return {
    async get(key: string, options?: R2GetOptions) {
      const found = objects.get(key);
      if (!found) return null;
      const header = options?.range instanceof Headers ? options.range.get("range") : null;
      let range = found.range ?? undefined;
      let body = found.bytes;
      const match = header ? /^bytes=(\d+)-(\d+)$/.exec(header) : null;
      if (match && found.range === undefined) {
        const offset = Number(match[1]);
        const end = Number(match[2]);
        range = { offset, length: end - offset + 1 };
        body = found.bytes.subarray(offset, end + 1);
      }
      return {
        body,
        size: found.bytes.length,
        httpEtag: '"etag-1"',
        range,
        writeHttpMetadata(headers: Headers) {
          if (found.contentType) headers.set("content-type", found.contentType);
        },
      } as unknown as R2ObjectBody;
    },
  } as unknown as R2Bucket;
}

const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const key = "2024-08-02T12-00-00.jpg";

function objects(extra?: Partial<Stored>): Map<string, Stored> {
  return new Map([[key, { bytes, ...extra }]]);
}

describe("serveObject", () => {
  it("無いキーは 404", async () => {
    const res = await serveObject(
      new Request("http://localhost/media/missing.jpg"),
      bucketOf(new Map()),
      "missing.jpg",
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("見つかりません。");
  });

  it("Content-Type が無ければ拡張子から付け、あればそれを残す", async () => {
    const plain = await serveObject(new Request("http://localhost/x"), bucketOf(objects()), key);
    expect(plain.status).toBe(200);
    expect(plain.headers.get("content-type")).toBe("image/jpeg");
    expect(plain.headers.get("etag")).toBe('"etag-1"');
    expect(plain.headers.get("accept-ranges")).toBe("bytes");
    expect(plain.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(new Uint8Array(await plain.arrayBuffer())).toEqual(bytes);

    const typed = await serveObject(
      new Request("http://localhost/x"),
      bucketOf(objects({ contentType: "image/png" })),
      key,
    );
    expect(typed.headers.get("content-type")).toBe("image/png");
  });

  it("Range があれば 206 と Content-Range", async () => {
    const res = await serveObject(
      new Request("http://localhost/x", { headers: { Range: "bytes=2-5" } }),
      bucketOf(objects()),
      key,
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([2, 3, 4, 5]));
  });

  it("suffix の range を Content-Range にする", async () => {
    const res = await serveObject(
      new Request("http://localhost/x", { headers: { Range: "bytes=-4" } }),
      bucketOf(objects({ range: { suffix: 4 } })),
      key,
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 6-9/10");
  });

  it("offset の無い range や range 無しは 200", async () => {
    const unparsed = await serveObject(
      new Request("http://localhost/x", { headers: { Range: "bytes=0-1" } }),
      bucketOf(objects({ range: { length: 4 } })),
      key,
    );
    expect(unparsed.status).toBe(200);
    expect(unparsed.headers.get("content-range")).toBeNull();
    const full = await serveObject(
      new Request("http://localhost/x", { headers: { Range: "bytes=0-1" } }),
      bucketOf(objects({ range: null })),
      key,
    );
    expect(full.status).toBe(200);
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(bytes);
  });
});

describe("getMedia", () => {
  function request(path: string, init?: RequestInit) {
    const app = new Hono<{ Bindings: Env }>();
    app.get("/media/*", getMedia);
    return app.request(path, init, { MEDIA: bucketOf(objects()) } as Env);
  }

  it("メディアのキーを返し、種類の無いパスは 404", async () => {
    const ok = await request(`/media/${key}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/jpeg");
    const missing = await request("/media/notes.txt");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("見つかりません。");
  });
});

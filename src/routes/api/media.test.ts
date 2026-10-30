import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import type { Env } from "../../lib/types.ts";
import { memoryBucket, pairOf } from "../../lib/media/media.fixtures.ts";
import { get } from "./media.ts";

const TIMING = /^r2;desc="[1-9]\d*";dur=\d+\.\d, total;dur=\d+\.\d$/;

function request(path: string, objects: Parameters<typeof memoryBucket>[0] = []) {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/api/media", get);
  return app.request(path, {}, { MEDIA: memoryBucket(objects).bucket as unknown as R2Bucket } as Env);
}

const sample = [
  ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
  ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
  ...pairOf("u-abc123def456.png", "2026-10-18T09:00:00.000Z"),
];

describe("GET /api/media", () => {
  it("年一覧と Server-Timing を返す", async () => {
    const res = await request("/api/media", sample);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("server-timing")).toMatch(TIMING);
    const body = (await res.json()) as { years: { label: string }[] };
    expect(body.years.map((card) => card.label)).toEqual(["2024", "2020", "年不明"]);
  });

  it("year でその年の組を返す", async () => {
    const res = await request("/api/media?year=2024", sample);
    expect(res.status).toBe(200);
    expect(res.headers.get("server-timing")).toMatch(TIMING);
    const body = (await res.json()) as { group: { label: string; items: { bodyKey: string }[] } | null; next: null };
    expect(body.next).toBeNull();
    expect(body.group?.label).toBe("2024");
    expect(body.group?.items.map((item) => item.bodyKey)).toEqual(["2024-08-02T12-00-00.jpg"]);
  });

  it("年不明と空の年", async () => {
    const unknown = await request("/api/media?year=unknown", sample);
    const unknownBody = (await unknown.json()) as { group: { label: string } | null };
    expect(unknownBody.group?.label).toBe("年不明");
    const empty = await request("/api/media?year=1999", sample);
    expect(await empty.json()).toEqual({ group: null, next: null });
  });

  it("不正な year は 400 で、Server-Timing は付けない", async () => {
    const res = await request("/api/media?year=0", sample);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("server-timing")).toBeNull();
    expect(await res.text()).toBe("year が不正です。");
  });
});

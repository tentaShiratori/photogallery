import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { pairOf } from "../../lib/media/media.fixtures.ts";
import { loadServerResponse } from "../../../test/router";
import { env } from "cloudflare:workers";

const TIMING = /^r2;desc="[1-9]\d*";dur=\d+\.\d, total;dur=\d+\.\d$/;

const sample = [
  ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
  ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
  ...pairOf("u-abc123def456.png", "2026-10-18T09:00:00.000Z"),
];

beforeAll(async () => {
  for (const object of sample) {
    await env.MEDIA.put(object.key, new Blob([]));
  }
});

describe("GET /api/media", () => {
  it("年一覧と Server-Timing を返す", async () => {
    const res = await loadServerResponse(new Request("http://localhost/api/media"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("server-timing")).toMatch(TIMING);
    const body = (await res.json()) as { years: { label: string }[] };
    expect(body.years.map((card) => card.label)).toEqual(["2024", "2020", "年不明"]);
  });

  it("year でその年の組を返す", async () => {
    const res = await loadServerResponse(new Request("http://localhost/api/media?year=2024"));
    expect(res.status).toBe(200);
    expect(res.headers.get("server-timing")).toMatch(TIMING);
    const body = (await res.json()) as { group: { label: string; items: { bodyKey: string }[] } | null; next: null };
    expect(body.next).toBeNull();
    expect(body.group?.label).toBe("2024");
    expect(body.group?.items.map((item) => item.bodyKey)).toEqual(["2024-08-02T12-00-00.jpg"]);
  });

  it("年不明と空の年", async () => {
    const unknown = await loadServerResponse(new Request("http://localhost/api/media?year=unknown"));
    const unknownBody = (await unknown.json()) as { group: { label: string } | null };
    expect(unknownBody.group?.label).toBe("年不明");
    const empty = await loadServerResponse(new Request("http://localhost/api/media?year=1999"));
    expect(await empty.json()).toEqual({ group: null, next: null });
  });

  it("不正な year は 400 で、Server-Timing は付けない", async () => {
    const res = await loadServerResponse(new Request("http://localhost/api/media?year=0"));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("server-timing")).toBeNull();
    expect(await res.text()).toBe("year が不正です。");
  });
});

import { describe, expect, it } from "vite-plus/test";
import {
  captureFromKey,
  galleryFromHeads,
  StemClaim,
  type BucketHead,
  type ThumbnailFile,
} from "./pair.ts";

const noon = {
  year: 2024,
  month: 8,
  day: 2,
  hour: 12,
  minute: 0,
  second: 0,
};

function head(key: string, uploaded: string, size = 10): BucketHead {
  return { key, size, uploaded };
}

function pairHeads(bodyKey: string, uploaded: string, size = 10): BucketHead[] {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  return [head(bodyKey, uploaded, size), head(`t/${stem}.webp`, uploaded, 4)];
}

function bodyKeys(view: ReturnType<typeof galleryFromHeads>): string[] {
  return view.groups.flatMap((group) => group.items.map((item) => item.bodyKey));
}

describe("StemClaim.plan", () => {
  it("同じ秒は拡張子が違っても別のステムになり、サムネイルは WebP", () => {
    const stems = new StemClaim();
    const jpg = stems.plan(noon, "JPG", "");
    const png = stems.plan(noon, "png", "");
    const gif = stems.plan(noon, "gif", "");
    expect(jpg.bodyKey).toBe("2024-08-02T12-00-00.jpg");
    expect(png.bodyKey).toBe("2024-08-02T12-00-00-2.png");
    expect(gif.bodyKey).toBe("2024-08-02T12-00-00-3.gif");
    expect(jpg.thumbKey).toBe("t/2024-08-02T12-00-00.webp");
    expect(png.thumbKey).toBe("t/2024-08-02T12-00-00-2.webp");
    expect(jpg.thumbKey.endsWith(".webp")).toBe(true);
    expect(jpg.kind).toBe("image");
    expect(jpg.bodyContentType).toBe("image/jpeg");
    const contentType = "image/webp" satisfies ThumbnailFile["contentType"];
    expect(contentType).toBe("image/webp");
  });

  it("日付が無いときは内容の識別子を使い、同じ識別子は -2 になる", () => {
    const stems = new StemClaim();
    const first = stems.plan(null, "png", "abc123def456");
    const second = stems.plan(null, "jpg", "abc123def456");
    expect(first.bodyKey).toBe("u-abc123def456.png");
    expect(first.thumbKey).toBe("t/u-abc123def456.webp");
    expect(second.bodyKey).toBe("u-abc123def456-2.jpg");
    expect(captureFromKey(first.bodyKey)).toBeNull();
  });

  it("別の秒は接尾辞を付けない", () => {
    const stems = new StemClaim();
    stems.plan(noon, "jpg", "");
    const later = stems.plan({ ...noon, second: 1 }, "jpg", "");
    expect(later.bodyKey).toBe("2024-08-02T12-00-01.jpg");
    expect(captureFromKey(later.bodyKey)).toEqual({ ...noon, second: 1 });
  });

  it("撮影日時のキーは接尾辞があっても同じ暦を返す", () => {
    const stems = new StemClaim();
    const first = stems.plan(noon, "jpg", "");
    const second = stems.plan(noon, "mov", "");
    expect(captureFromKey(first.bodyKey)).toEqual(noon);
    expect(captureFromKey(second.bodyKey)).toEqual(noon);
    expect(second.kind).toBe("video");
  });

  it("暦として読めない撮影日時や短い識別子ではキーを作らない", () => {
    const stems = new StemClaim();
    expect(() =>
      stems.plan({ year: 2024, month: 13, day: 1, hour: 0, minute: 0, second: 0 }, "jpg", ""),
    ).toThrow();
    expect(() => stems.plan(null, "png", "abc")).toThrow();
  });
});

describe("galleryFromHeads", () => {
  it("揃った組だけを年で分け、片側や t/ の WebP 単独や入れ子は出さない", () => {
    const view = galleryFromHeads(
      [
        ...pairHeads("u-abc123def456.png", "2026-10-18T09:00:00.000Z"),
        ...pairHeads("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
        head("folder/nested.jpg", "2026-10-18T08:00:00.000Z"),
        head("2022-01-01T00-00-00.jpg", "2026-10-18T08:00:00.000Z"),
        head("t/2020-01-01T00-00-00.webp", "2026-10-18T08:00:00.000Z"),
        head("t/2024-08-02T12-00-00.WEBP", "2026-10-18T08:00:00.000Z"),
      ],
      false,
    );
    expect(view.truncated).toBe(false);
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[2]?.year).toBeNull();
    expect(view.groups[2]?.items.map((item) => item.bodyKey)).toEqual(["u-abc123def456.png"]);
    expect(bodyKeys(view).some((key) => key.startsWith("t/"))).toBe(false);
    expect(bodyKeys(view)).not.toContain("folder/nested.jpg");
    expect(bodyKeys(view)).not.toContain("2022-01-01T00-00-00.jpg");
  });

  it("サムネイルが thumbKey の形でないと組にしない", () => {
    const view = galleryFromHeads(
      [
        head("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
        head("t/2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
        head("thumbs/2024-08-02T12-00-00.webp", "2026-10-18T01:00:00.000Z"),
      ],
      false,
    );
    expect(view.groups).toEqual([]);
  });

  it("同じステムの本体が二つあるとサムネイルがあっても出さない", () => {
    const uploaded = "2026-10-18T01:00:00.000Z";
    const heads = [
      head("2024-08-02T12-00-00.jpg", uploaded),
      head("2024-08-02T12-00-00.png", uploaded),
      head("t/2024-08-02T12-00-00.webp", uploaded),
    ];
    expect(galleryFromHeads(heads, false).groups).toEqual([]);
    expect(
      galleryFromHeads(
        [
          head("t/2024-08-02T12-00-00.webp", uploaded),
          head("2024-08-02T12-00-00.jpg", uploaded),
          head("2024-08-02T12-00-00.png", uploaded),
        ],
        false,
      ).groups,
    ).toEqual([]);
  });

  it("本体が先でもサムネイルが先でも 1 件になり、フィールドは組の公開分だけ", () => {
    const uploaded = "2026-10-18T01:00:00.000Z";
    const body = head("2024-08-02T12-00-00.jpg", uploaded);
    const thumb = head("t/2024-08-02T12-00-00.webp", uploaded);
    for (const heads of [
      [body, thumb, thumb],
      [thumb, body],
    ]) {
      const view = galleryFromHeads(heads, true);
      expect(view.truncated).toBe(true);
      expect(view.groups).toHaveLength(1);
      const item = view.groups[0]?.items[0];
      expect(item?.bodyKey).toBe("2024-08-02T12-00-00.jpg");
      expect(item?.kind).toBe("image");
      expect(item?.bodyUrl).toBe("/media/2024-08-02T12-00-00.jpg");
      expect(item?.thumbUrl).toBe("/media/t/2024-08-02T12-00-00.webp");
      expect(item?.caption).toBe("2024-08-02T12-00-00.jpg");
      expect(Object.keys(item ?? {}).sort()).toEqual([
        "bodyKey",
        "bodyUrl",
        "caption",
        "kind",
        "thumbUrl",
      ]);
    }
  });

  it("年内は暦の降順、同じ秒は uploaded の次に bodyKey", () => {
    const view = galleryFromHeads(
      [
        ...pairHeads("2024-08-02T12-00-00-3.jpg", "2026-01-01T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00-2.jpg", "2026-01-02T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
        ...pairHeads("2024-01-02T08-00-00.jpg", "2026-06-01T00:00:00.000Z"),
        ...pairHeads("2024-12-02T08-00-00.jpg", "2026-01-01T00:00:00.000Z"),
      ],
      false,
    );
    expect(view.groups[0]?.items.map((item) => item.bodyKey)).toEqual([
      "2024-12-02T08-00-00.jpg",
      "2024-08-02T12-00-00-2.jpg",
      "2024-08-02T12-00-00.jpg",
      "2024-08-02T12-00-00-3.jpg",
      "2024-01-02T08-00-00.jpg",
    ]);
  });

  it("全部に日付があれば年不明は付かない", () => {
    const view = galleryFromHeads(
      [
        ...pairHeads("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
      ],
      false,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020"]);
  });

  it("動画と画像を種類と URL 付きで返し、年不明は uploaded の次に bodyKey", () => {
    const view = galleryFromHeads(
      [
        ...pairHeads("u-bbbbbbbbbbbb.mp4", "2026-10-17T09:00:00.000Z"),
        ...pairHeads("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
        ...pairHeads("2024-08-02T15-00-00.mov", "2026-10-18T02:00:00.000Z"),
        ...pairHeads("u-aaaaaaaaaaaa.png", "2026-10-18T09:00:00.000Z"),
        ...pairHeads("u-cccccccccccc.png", "2026-10-18T09:00:00.000Z"),
      ],
      false,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[0]?.items.map((item) => item.bodyKey)).toEqual([
      "2024-08-02T15-00-00.mov",
      "2024-08-02T12-00-00.jpg",
    ]);
    expect(view.groups[0]?.items[0]?.bodyUrl).toBe("/media/2024-08-02T15-00-00.mov");
    expect(view.groups[0]?.items[0]?.thumbUrl).toBe("/media/t/2024-08-02T15-00-00.webp");
    expect(view.groups[0]?.items[0]?.kind).toBe("video");
    expect(view.groups[0]?.items[1]?.kind).toBe("image");
    expect(view.groups[2]?.items.map((item) => item.bodyKey)).toEqual([
      "u-aaaaaaaaaaaa.png",
      "u-cccccccccccc.png",
      "u-bbbbbbbbbbbb.mp4",
    ]);
  });

  it("存在しない日や -1 の接尾辞は組にしない", () => {
    const view = galleryFromHeads(
      [
        ...pairHeads("2023-02-29T00-00-00.jpg", "2026-01-01T00:00:00.000Z"),
        ...pairHeads("2024-08-02T12-00-00-1.jpg", "2026-01-01T00:00:00.000Z"),
        ...pairHeads("2024-02-29T00-00-00.jpg", "2026-01-01T00:00:00.000Z"),
      ],
      false,
    );
    expect(bodyKeys(view)).toEqual(["2024-02-29T00-00-00.jpg"]);
  });
});

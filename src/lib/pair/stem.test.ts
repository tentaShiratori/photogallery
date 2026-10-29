import { describe, expect, it } from "vite-plus/test";
import { noon } from "./fixtures.ts";
import {
  captureFromKey,
  StemClaim,
  type ThumbnailFile,
  type ThumbKey,
  type UploadPlan,
} from "./index.ts";

describe("StemClaim.plan", () => {
  it("同じ秒は拡張子が違っても別のステムになり、サムネイルは WebP", () => {
    const stems = new StemClaim();
    const jpg: UploadPlan = stems.plan(noon, "JPG", "");
    const png = stems.plan(noon, "png", "");
    const gif = stems.plan(noon, "gif", "");
    const thumb: ThumbKey = jpg.thumbKey;
    expect(jpg.bodyKey).toBe("2024-08-02T12-00-00.jpg");
    expect(png.bodyKey).toBe("2024-08-02T12-00-00-2.png");
    expect(gif.bodyKey).toBe("2024-08-02T12-00-00-3.gif");
    expect(thumb).toBe("t/2024-08-02T12-00-00.webp");
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

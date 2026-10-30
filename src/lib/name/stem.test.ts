import { describe, expect, it } from "vite-plus/test";
import { noon } from "../media/media.fixtures.ts";
import { captureFromKey, classify, kindOfBody, StemClaim, thumbKeyFor, urlForBody, urlForThumb } from "./stem.ts";
import type { BodyKey, ThumbnailFile, ThumbKey, UploadPlan } from "./types.ts";

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
    expect(() => stems.plan({ year: 2024, month: 13, day: 1, hour: 0, minute: 0, second: 0 }, "jpg", "")).toThrow(
      "ステムを作れません",
    );
    expect(() => stems.plan(null, "png", "abc")).toThrow("ステムを作れません");
    expect(() => stems.plan(noon, "txt", "")).toThrow("本体キーを作れません");
  });
});

describe("classify", () => {
  it("本体とサムネイルを分け、形の合わないキーは null", () => {
    const plan = new StemClaim().plan(noon, "jpg", "");
    expect(classify(plan.bodyKey)).toEqual({
      stem: "2024-08-02T12-00-00",
      role: "body",
      bodyKey: plan.bodyKey,
    });
    expect(classify(plan.thumbKey)).toEqual({
      stem: "2024-08-02T12-00-00",
      role: "thumb",
      thumbKey: plan.thumbKey,
    });
    expect(classify("u-abc123def456.png")?.role).toBe("body");
    expect(classify("t/u-abc123def456.webp")?.role).toBe("thumb");
    expect(classify("2024-02-29T00-00-00.jpg")?.role).toBe("body");
    expect(classify("2024-08-02T12-00-60.jpg")?.role).toBe("body");
    for (const key of [
      "",
      "folder/2024-08-02T12-00-00.jpg",
      "2024-08-02T12-00-00.txt",
      "2024-13-02T12-00-00.jpg",
      "2023-02-29T00-00-00.jpg",
      "2024-08-02T12-00-00-1.jpg",
      "t/2024-08-02T12-00-00.jpg",
      "u-abc.png",
      "u-abc123def456-1.png",
    ]) {
      expect(classify(key)).toBeNull();
    }
  });
});

describe("URL とサムネイルキー", () => {
  it("計画したキーから URL と種類を返す", () => {
    const plan = new StemClaim().plan(noon, "mov", "");
    expect(thumbKeyFor(plan.bodyKey)).toBe("t/2024-08-02T12-00-00.webp");
    expect(urlForBody(plan.bodyKey)).toBe("/media/2024-08-02T12-00-00.mov");
    expect(urlForThumb(plan.thumbKey)).toBe("/media/t/2024-08-02T12-00-00.webp");
    expect(kindOfBody(plan.bodyKey)).toBe("video");
  });

  it("形の合わないキーでは作らない", () => {
    expect(() => thumbKeyFor("nope" as BodyKey)).toThrow("サムネイルキーを作れません");
    expect(() => urlForBody("a/b.jpg" as BodyKey)).toThrow("本体 URL を作れません");
    expect(() => urlForThumb("nope" as ThumbKey)).toThrow("サムネイル URL を作れません");
    expect(() => kindOfBody("notes.txt" as BodyKey)).toThrow("種類がありません");
  });
});

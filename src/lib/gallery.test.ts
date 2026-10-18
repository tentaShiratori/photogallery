import { describe, expect, it } from "vite-plus/test";
import {
  assembleGallery,
  captureFromKey,
  captureFromMtime,
  embeddedCapture,
  objectKey,
  type ObjectHead,
} from "./gallery.ts";
import {
  barePng,
  heicExif,
  jpegDateTime,
  jpegExif,
  macSeconds,
  mp4,
  pngExif,
  webpExif,
} from "../../test/capture-fixtures.ts";

const noon = {
  year: 2024,
  month: 8,
  day: 2,
  hour: 12,
  minute: 0,
  second: 0,
};

function head(key: string, size: number, uploaded: string): ObjectHead {
  return { key, size, uploaded };
}

function openFiles(files: Map<string, Uint8Array>) {
  const calls: { key: string; offset: number; length: number }[] = [];
  const read = async (key: string, offset: number, length: number) => {
    calls.push({ key, offset, length });
    const file = files.get(key);
    if (!file || length <= 0 || offset >= file.length) return new Uint8Array();
    return file.slice(offset, Math.min(file.length, offset + length));
  };
  return { calls, read };
}

function overlaps(offset: number, length: number, start: number, end: number): boolean {
  return offset < end && offset + length > start;
}

describe("embeddedCapture", () => {
  it("JPEG の DateTimeOriginal を返し、DateTime だけでは null", async () => {
    const ii = jpegExif("2024:08:02 12:00:00", "II");
    const mm = jpegExif("2024:08:02 12:00:00", "MM");
    const onlyDateTime = jpegDateTime("2024:08:02 12:00:00");
    const files = new Map<string, Uint8Array>([
      ["ii.jpg", ii],
      ["mm.jpg", mm],
      ["dated-wrong.jpg", onlyDateTime],
    ]);
    const { read } = openFiles(files);
    expect(await embeddedCapture("ii.jpg", ii.length, read)).toEqual(noon);
    expect(await embeddedCapture("mm.jpg", mm.length, read)).toEqual(noon);
    expect(await embeddedCapture("dated-wrong.jpg", onlyDateTime.length, read)).toBeNull();
  });

  it("mdat の後ろの mvhd を読み、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "after-mdat", wideMdat: true });
    const { calls, read } = openFiles(new Map([["tail.mov", built.bytes]]));
    expect(await embeddedCapture("tail.mov", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 2,
      hour: 15,
      minute: 0,
      second: 0,
    });
    expect(
      calls.some((call) =>
        overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd),
      ),
    ).toBe(false);
  });

  it("moov が mdat より前でも同じ時刻になり、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "before-mdat" });
    const { calls, read } = openFiles(new Map([["head.m4v", built.bytes]]));
    expect(await embeddedCapture("head.m4v", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 2,
      hour: 15,
      minute: 0,
      second: 0,
    });
    expect(
      calls.some((call) =>
        overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd),
      ),
    ).toBe(false);
  });

  it("creation_time が 0 の mp4 は null", async () => {
    const built = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "after-mdat",
    });
    const { read } = openFiles(new Map([["unset.mp4", built.bytes]]));
    expect(await embeddedCapture("unset.mp4", built.bytes.length, read)).toBeNull();
  });

  it("HEIC は iloc method 0 の DateTimeOriginal を使い、method 1 は null", async () => {
    const bytes = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0));
    const method1 = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0), 1);
    const files = new Map<string, Uint8Array>([
      ["photo.heic", bytes],
      ["idat.heic", method1],
    ]);
    const { read } = openFiles(files);
    expect(await embeddedCapture("photo.heic", bytes.length, read)).toEqual(noon);
    expect(await embeddedCapture("idat.heic", method1.length, read)).toBeNull();
  });

  it("gif と webm は読まない", async () => {
    const { calls, read } = openFiles(new Map());
    expect(await embeddedCapture("old.gif", 8, read)).toBeNull();
    expect(await embeddedCapture("new.webm", 8, read)).toBeNull();
    expect(calls).toEqual([]);
  });

  it("読み取りが投げたら null", async () => {
    const read = async () => {
      throw new Error("unreadable");
    };
    expect(await embeddedCapture("bad.jpg", 32, read)).toBeNull();
  });

  it("PNG の eXIf を読み、IDAT 本体は読まない", async () => {
    const built = pngExif("2020:03:04 05:06:07");
    const { calls, read } = openFiles(new Map([["shot.png", built.bytes]]));
    expect(await embeddedCapture("shot.png", built.bytes.length, read)).toEqual({
      year: 2020,
      month: 3,
      day: 4,
      hour: 5,
      minute: 6,
      second: 7,
    });
    expect(
      calls.some((call) =>
        overlaps(call.offset, call.length, built.idatPayloadStart, built.idatPayloadEnd),
      ),
    ).toBe(false);
  });

  it("WebP の EXIF を読み、フレーム本体は読まない", async () => {
    const built = webpExif("2019:11:02 03:04:05");
    const { calls, read } = openFiles(new Map([["shot.webp", built.bytes]]));
    expect(await embeddedCapture("shot.webp", built.bytes.length, read)).toEqual({
      year: 2019,
      month: 11,
      day: 2,
      hour: 3,
      minute: 4,
      second: 5,
    });
    expect(
      calls.some((call) =>
        overlaps(call.offset, call.length, built.framePayloadStart, built.framePayloadEnd),
      ),
    ).toBe(false);
  });
});

describe("captureFromMtime", () => {
  it("アップロードより 7 日より古い更新日時を現地の暦にする", () => {
    const mtime = new Date("2014-07-23T03:01:10.000Z");
    const now = new Date("2026-10-18T00:00:00.000Z");
    expect(captureFromMtime(mtime, now)).toEqual({
      year: mtime.getFullYear(),
      month: mtime.getMonth() + 1,
      day: mtime.getDate(),
      hour: mtime.getHours(),
      minute: mtime.getMinutes(),
      second: mtime.getSeconds(),
    });
  });

  it("アップロードの 7 日以内の更新日時は null", () => {
    const now = new Date("2026-10-18T00:00:00.000Z");
    const recent = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const exact = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const older = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(captureFromMtime(recent, now)).toBeNull();
    expect(captureFromMtime(exact, now)).toBeNull();
    expect(captureFromMtime(older, now)?.year).toBe(older.getFullYear());
  });
});

describe("objectKey", () => {
  it("撮影日時をファイル名にし、同じ秒は -2 を付ける", () => {
    const taken = new Set<string>();
    expect(objectKey(noon, "JPG", "", taken)).toBe("2024-08-02T12-00-00.jpg");
    expect(objectKey(noon, "jpg", "", taken)).toBe("2024-08-02T12-00-00-2.jpg");
  });

  it("日付が無いときは内容の識別子を使い、元の名前は残さない", () => {
    const taken = new Set<string>();
    expect(objectKey(null, "png", "abc123def456", taken)).toBe("u-abc123def456.png");
  });
});

describe("assembleGallery", () => {
  it("キーの撮影日時で年を分け、読めないキーは年不明", () => {
    const view = assembleGallery([
      head("u-abc.png", 10, "2026-10-18T09:00:00.000Z"),
      head("2020-01-01T00-00-01.jpg", 10, "2026-10-01T00:00:00.000Z"),
      head("2024-08-02T12-00-00.jpg", 10, "2026-10-18T01:00:00.000Z"),
      head("folder/nested.jpg", 10, "2026-10-18T08:00:00.000Z"),
    ]);
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[2]?.year).toBeNull();
    expect(view.groups[2]?.items.map((item) => item.key)).toEqual([
      "u-abc.png",
      "folder/nested.jpg",
    ]);
    expect(captureFromKey("2024-08-02T12-00-00-2.jpg")).toEqual(noon);
    expect(captureFromKey("not-a-date.jpg")).toBeNull();
  });

  it("年内は暦の降順、同じ秒は uploaded の次に key", () => {
    const view = assembleGallery([
      head("2024-08-02T12-00-00-3.jpg", 10, "2026-01-01T00:00:00.000Z"),
      head("2024-08-02T12-00-00-2.jpg", 10, "2026-01-02T00:00:00.000Z"),
      head("2024-08-02T12-00-00.jpg", 10, "2026-01-02T00:00:00.000Z"),
      head("2024-01-02T08-00-00.jpg", 10, "2026-06-01T00:00:00.000Z"),
      head("2024-12-02T08-00-00.jpg", 10, "2026-01-01T00:00:00.000Z"),
    ]);
    expect(view.groups[0]?.items.map((item) => item.key)).toEqual([
      "2024-12-02T08-00-00.jpg",
      "2024-08-02T12-00-00-2.jpg",
      "2024-08-02T12-00-00.jpg",
      "2024-08-02T12-00-00-3.jpg",
      "2024-01-02T08-00-00.jpg",
    ]);
  });

  it("全部に日付があれば年不明は付かない", () => {
    const view = assembleGallery([
      head("2020-01-01T00-00-01.jpg", 10, "2026-10-01T00:00:00.000Z"),
      head("2024-08-02T12-00-00.jpg", 10, "2026-10-18T01:00:00.000Z"),
    ]);
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020"]);
  });

  it("動画と画像を種類付きで返す", () => {
    const view = assembleGallery([
      head("verify.mp4", 10, "2026-10-17T09:00:00.000Z"),
      head("2020-01-01T00-00-01.jpg", 10, "2026-10-01T00:00:00.000Z"),
      head("2024-08-02T12-00-00.jpg", 10, "2026-10-18T01:00:00.000Z"),
      head("2024-08-02T15-00-00.mov", 10, "2026-10-18T02:00:00.000Z"),
      head("verify.png", barePng.length, "2026-10-18T09:00:00.000Z"),
    ]);
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[0]?.items.map((item) => item.key)).toEqual([
      "2024-08-02T15-00-00.mov",
      "2024-08-02T12-00-00.jpg",
    ]);
    expect(view.groups[0]?.items[0]?.url).toBe("/media/2024-08-02T15-00-00.mov");
    expect(view.groups[0]?.items[0]?.kind).toBe("video");
    expect(view.groups[0]?.items[1]?.kind).toBe("image");
    expect(view.groups[2]?.items.map((item) => item.key)).toEqual(["verify.png", "verify.mp4"]);
  });
});

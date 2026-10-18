import { describe, expect, it } from "vite-plus/test";
import { assembleGallery, type ObjectHead } from "./gallery.ts";
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

function head(key: string, bytes: Uint8Array, uploaded: string): ObjectHead {
  return { key, size: bytes.length, uploaded };
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

describe("assembleGallery", () => {
  it("JPEG の DateTimeOriginal を年グループの成分にする", async () => {
    const files = new Map<string, Uint8Array>([
      ["ii.jpg", jpegExif("2024:08:02 12:00:00", "II")],
      ["mm.jpg", jpegExif("2024:08:02 12:00:00", "MM")],
    ]);
    const { read } = openFiles(files);
    const view = await assembleGallery(
      [
        head("mm.jpg", files.get("mm.jpg")!, "2026-01-01T00:00:00.000Z"),
        head("ii.jpg", files.get("ii.jpg")!, "2026-01-02T00:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024"]);
    expect(view.groups[0]?.items.map((item) => item.captured)).toEqual([noon, noon]);
  });

  it("DateTime タグだけの JPEG は年不明", async () => {
    const bytes = jpegDateTime("2024:08:02 12:00:00");
    const { read } = openFiles(new Map([["dated-wrong.jpg", bytes]]));
    const view = await assembleGallery(
      [head("dated-wrong.jpg", bytes, "2026-01-01T00:00:00.000Z")],
      read,
    );
    expect(view.groups).toEqual([
      {
        label: "年不明",
        year: null,
        items: [
          expect.objectContaining({
            key: "dated-wrong.jpg",
            captured: null,
          }),
        ],
      },
    ]);
  });

  it("mdat の後ろの mvhd から年を取り、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "after-mdat", wideMdat: true });
    const { calls, read } = openFiles(new Map([["tail.mov", built.bytes]]));
    const view = await assembleGallery(
      [head("tail.mov", built.bytes, "2026-10-18T02:00:00.000Z")],
      read,
    );
    expect(view.groups[0]?.label).toBe("2024");
    expect(view.groups[0]?.items[0]?.captured).toEqual({
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

  it("moov が mdat より前でも同じ年になり、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "before-mdat" });
    const { calls, read } = openFiles(new Map([["head.m4v", built.bytes]]));
    const view = await assembleGallery(
      [head("head.m4v", built.bytes, "2026-10-18T02:00:00.000Z")],
      read,
    );
    expect(view.groups[0]?.items[0]?.captured).toEqual({
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

  it("creation_time が 0 の mp4 は年不明", async () => {
    const built = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "after-mdat",
    });
    const { read } = openFiles(new Map([["unset.mp4", built.bytes]]));
    const view = await assembleGallery(
      [head("unset.mp4", built.bytes, "2026-10-17T09:00:00.000Z")],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["年不明"]);
    expect(view.groups[0]?.items[0]?.captured).toBeNull();
  });

  it("HEIC は iloc method 0 の DateTimeOriginal を年にし、mvhd は使わない", async () => {
    const bytes = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0));
    const { read } = openFiles(new Map([["photo.heic", bytes]]));
    const view = await assembleGallery(
      [head("photo.heic", bytes, "2026-01-01T00:00:00.000Z")],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024"]);
    expect(view.groups[0]?.items[0]?.captured).toEqual(noon);
  });

  it("HEIC の iloc method 1 は年不明", async () => {
    const bytes = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0), 1);
    const { read } = openFiles(new Map([["idat.heic", bytes]]));
    const view = await assembleGallery(
      [head("idat.heic", bytes, "2026-01-01T00:00:00.000Z")],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["年不明"]);
  });

  it("gif と webm は読まずに年不明", async () => {
    const { calls, read } = openFiles(new Map());
    const view = await assembleGallery(
      [
        head("old.gif", new Uint8Array(8), "2026-01-01T00:00:00.000Z"),
        head("new.webm", new Uint8Array(8), "2026-02-01T00:00:00.000Z"),
      ],
      read,
    );
    expect(calls).toEqual([]);
    expect(view.groups).toEqual([
      {
        label: "年不明",
        year: null,
        items: [
          expect.objectContaining({ key: "new.webm", kind: "video", captured: null }),
          expect.objectContaining({ key: "old.gif", kind: "image", captured: null }),
        ],
      },
    ]);
  });

  it("年内は暦の降順、同じ秒は uploaded の次に key", async () => {
    const early = jpegExif("2024:01:02 08:00:00");
    const late = jpegExif("2024:12:02 08:00:00");
    const a = jpegExif("2024:08:02 12:00:00");
    const m = jpegExif("2024:08:02 12:00:00");
    const z = jpegExif("2024:08:02 12:00:00");
    const files = new Map([
      ["early.jpg", early],
      ["late.jpg", late],
      ["a.jpg", a],
      ["m.jpg", m],
      ["z.jpg", z],
    ]);
    const { read } = openFiles(files);
    const view = await assembleGallery(
      [
        head("z.jpg", z, "2026-01-01T00:00:00.000Z"),
        head("m.jpg", m, "2026-01-02T00:00:00.000Z"),
        head("a.jpg", a, "2026-01-02T00:00:00.000Z"),
        head("early.jpg", early, "2026-06-01T00:00:00.000Z"),
        head("late.jpg", late, "2026-01-01T00:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024"]);
    expect(view.groups[0]?.items.map((item) => item.key)).toEqual([
      "late.jpg",
      "a.jpg",
      "m.jpg",
      "z.jpg",
      "early.jpg",
    ]);
  });

  it("年は降順で、年不明は最後", async () => {
    const newer = jpegExif("2024:08:02 12:00:00");
    const older = jpegExif("2020:01:01 00:00:01");
    const files = new Map<string, Uint8Array>([
      ["new.jpg", newer],
      ["old.jpg", older],
      ["plain.png", barePng],
    ]);
    const { read } = openFiles(files);
    const view = await assembleGallery(
      [
        head("plain.png", barePng, "2026-10-18T09:00:00.000Z"),
        head("old.jpg", older, "2026-10-01T00:00:00.000Z"),
        head("new.jpg", newer, "2026-10-18T01:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[2]?.year).toBeNull();
  });

  it("全部に日付があれば年不明は付かない", async () => {
    const newer = jpegExif("2024:08:02 12:00:00");
    const older = jpegExif("2020:01:01 00:00:01");
    const files = new Map([
      ["new.jpg", newer],
      ["old.jpg", older],
    ]);
    const { read } = openFiles(files);
    const view = await assembleGallery(
      [
        head("old.jpg", older, "2026-10-01T00:00:00.000Z"),
        head("new.jpg", newer, "2026-10-18T01:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020"]);
  });

  it("1件の読みが投げても他の年グループは残る", async () => {
    const good = jpegExif("2024:08:02 12:00:00");
    const files = new Map([["good.jpg", good]]);
    const read = async (key: string, offset: number, length: number) => {
      if (key === "bad.jpg") throw new Error("unreadable");
      const file = files.get(key);
      if (!file) return new Uint8Array();
      return file.slice(offset, offset + length);
    };
    const view = await assembleGallery(
      [
        head("bad.jpg", new Uint8Array(32), "2026-03-01T00:00:00.000Z"),
        head("good.jpg", good, "2026-01-01T00:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "年不明"]);
    expect(view.groups[0]?.items.map((item) => item.key)).toEqual(["good.jpg"]);
    expect(view.groups[1]?.items.map((item) => item.key)).toEqual(["bad.jpg"]);
  });

  it("PNG の eXIf を年にし、IDAT 本体は読まない", async () => {
    const built = pngExif("2020:03:04 05:06:07");
    const { calls, read } = openFiles(new Map([["shot.png", built.bytes]]));
    const view = await assembleGallery(
      [head("shot.png", built.bytes, "2026-01-01T00:00:00.000Z")],
      read,
    );
    expect(view.groups[0]?.items[0]?.captured).toEqual({
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

  it("WebP の EXIF を年にし、フレーム本体は読まない", async () => {
    const built = webpExif("2019:11:02 03:04:05");
    const { calls, read } = openFiles(new Map([["shot.webp", built.bytes]]));
    const view = await assembleGallery(
      [head("shot.webp", built.bytes, "2026-01-01T00:00:00.000Z")],
      read,
    );
    expect(view.groups[0]?.items[0]?.captured).toEqual({
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

  it("usage の並びを groups で返す", async () => {
    const video = mp4({
      creationSeconds: macSeconds(2024, 8, 2, 15, 0, 0),
      moov: "after-mdat",
      wideMdat: true,
    });
    const image = jpegExif("2024:08:02 12:00:00");
    const older = jpegExif("2020:01:01 00:00:01");
    const unset = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "before-mdat",
    });
    const files = new Map<string, Uint8Array>([
      ["VID_0001.mov", video.bytes],
      ["IMG_0002.jpg", image],
      ["old.jpg", older],
      ["verify.png", barePng],
      ["verify.mp4", unset.bytes],
    ]);
    const { calls, read } = openFiles(files);
    const view = await assembleGallery(
      [
        head("verify.mp4", unset.bytes, "2026-10-17T09:00:00.000Z"),
        head("old.jpg", older, "2026-10-01T00:00:00.000Z"),
        head("IMG_0002.jpg", image, "2026-10-18T01:00:00.000Z"),
        head("VID_0001.mov", video.bytes, "2026-10-18T02:00:00.000Z"),
        head("verify.png", barePng, "2026-10-18T09:00:00.000Z"),
      ],
      read,
    );
    expect(view.groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(view.groups[0]?.items.map((item) => item.key)).toEqual(["VID_0001.mov", "IMG_0002.jpg"]);
    expect(view.groups[0]?.items[0]?.url).toBe("/media/VID_0001.mov");
    expect(view.groups[0]?.items[0]?.kind).toBe("video");
    expect(view.groups[0]?.items[1]?.kind).toBe("image");
    expect(view.groups[1]?.items.map((item) => item.key)).toEqual(["old.jpg"]);
    expect(view.groups[1]?.items[0]?.captured).toEqual({
      year: 2020,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 1,
    });
    expect(view.groups[2]?.items.map((item) => item.key)).toEqual(["verify.png", "verify.mp4"]);
    expect(
      calls
        .filter((call) => call.key === "VID_0001.mov")
        .some((call) =>
          overlaps(call.offset, call.length, video.mdatPayloadStart, video.mdatPayloadEnd),
        ),
    ).toBe(false);
  });
});

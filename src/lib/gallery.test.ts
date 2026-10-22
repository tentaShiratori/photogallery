import { describe, expect, it } from "vite-plus/test";
import { captureFromMtime, embeddedCapture } from "./gallery.ts";
import {
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

function creationdateKeys(where: "moov" | "udta", creationdate: string) {
  return {
    in: where,
    items: [
      ["com.apple.quicktime.make", "Apple"],
      ["com.apple.quicktime.creationdate", creationdate],
    ] as const,
  };
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
    const creation = macSeconds(2024, 8, 2, 6, 0, 0);
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
    const creation = macSeconds(2024, 8, 2, 6, 0, 0);
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

  it("creationdate の年から秒までを使い、時差と mvhd は捨てる", async () => {
    const expected = {
      year: 2024,
      month: 8,
      day: 2,
      hour: 15,
      minute: 0,
      second: 0,
    };
    for (const where of ["moov", "udta"] as const) {
      const built = mp4({
        creationSeconds: macSeconds(2024, 8, 2, 22, 0, 0),
        moov: "after-mdat",
        keys: creationdateKeys(where, "2024-08-02T15:00:00-0700"),
      });
      const name = `abroad-${where}.mov`;
      const { calls, read } = openFiles(new Map([[name, built.bytes]]));
      expect(await embeddedCapture(name, built.bytes.length, read)).toEqual(expected);
      expect(
        calls.some((call) =>
          overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd),
        ),
      ).toBe(false);
    }
  });

  it("creationdate が無い・読めないときは mvhd を日本の暦にする", async () => {
    const bare = mp4({
      creationSeconds: macSeconds(2014, 9, 15, 9, 33, 31),
      moov: "after-mdat",
    });
    const tokyo = {
      year: 2014,
      month: 9,
      day: 15,
      hour: 18,
      minute: 33,
      second: 31,
    };
    const nextDay = {
      year: 2024,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    };
    const malformed = [
      "2014-09-15T18:33:31",
      "2014-09-15T18:33:31Z",
      "2014-13-15T18:33:31+0900",
    ].map((creationdate, index) => ({
      name: `bad-${index}.mp4`,
      built: mp4({
        creationSeconds: macSeconds(2023, 12, 31, 15, 0, 0),
        moov: "after-mdat",
        keys: creationdateKeys("moov", creationdate),
      }),
    }));
    const files = new Map<string, Uint8Array>([
      ["bare.mov", bare.bytes],
      ...malformed.map(({ name, built }) => [name, built.bytes] as const),
    ]);
    const { read } = openFiles(files);
    expect(await embeddedCapture("bare.mov", bare.bytes.length, read)).toEqual(tokyo);
    for (const { name, built } of malformed) {
      expect(await embeddedCapture(name, built.bytes.length, read)).toEqual(nextDay);
    }
  });

  it("iPhone の実測値は creationdate があっても無くても同じ暦になる", async () => {
    const samples = [
      {
        stem: "1252",
        seconds: macSeconds(2014, 9, 15, 9, 33, 31),
        creationdate: "2014-09-15T18:33:31+0900",
        expected: {
          year: 2014,
          month: 9,
          day: 15,
          hour: 18,
          minute: 33,
          second: 31,
        },
      },
      {
        stem: "IMG_6437",
        seconds: macSeconds(2016, 8, 17, 1, 26, 10),
        creationdate: "2016-08-17T10:26:10+0900",
        expected: {
          year: 2016,
          month: 8,
          day: 17,
          hour: 10,
          minute: 26,
          second: 10,
        },
      },
    ];
    for (const sample of samples) {
      const plain = mp4({ creationSeconds: sample.seconds, moov: "after-mdat" });
      const tagged = mp4({
        creationSeconds: sample.seconds,
        moov: "after-mdat",
        keys: creationdateKeys("moov", sample.creationdate),
      });
      const plainName = `${sample.stem}.MOV`;
      const taggedName = `${sample.stem}-tagged.MOV`;
      const { read } = openFiles(
        new Map<string, Uint8Array>([
          [plainName, plain.bytes],
          [taggedName, tagged.bytes],
        ]),
      );
      expect(await embeddedCapture(plainName, plain.bytes.length, read)).toEqual(sample.expected);
      expect(await embeddedCapture(taggedName, tagged.bytes.length, read)).toEqual(sample.expected);
    }
  });

  it("creation_time が 0 で creationdate も無い mp4 は null", async () => {
    const built = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "after-mdat",
    });
    const { read } = openFiles(new Map([["unset.mp4", built.bytes]]));
    expect(await embeddedCapture("unset.mp4", built.bytes.length, read)).toBeNull();
  });

  it("creation_time が 0 でも creationdate があれば使う", async () => {
    const built = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "after-mdat",
      keys: creationdateKeys("moov", "2024-08-02T15:00:00-0700"),
    });
    const { read } = openFiles(new Map([["dated-unset-mvhd.mov", built.bytes]]));
    expect(await embeddedCapture("dated-unset-mvhd.mov", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 2,
      hour: 15,
      minute: 0,
      second: 0,
    });
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

import { describe, expect, it } from "vite-plus/test";
import { embeddedCapture } from "./index.ts";
import { noon, openFiles, overlaps } from "./fixtures.ts";
import { heicExif, jpegDateTime, jpegExif, macSeconds, pngExif, webpExif } from "../../../test/capture-fixtures.ts";

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
    expect(calls.some((call) => overlaps(call.offset, call.length, built.idatPayloadStart, built.idatPayloadEnd))).toBe(
      false,
    );
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
      calls.some((call) => overlaps(call.offset, call.length, built.framePayloadStart, built.framePayloadEnd)),
    ).toBe(false);
  });
});

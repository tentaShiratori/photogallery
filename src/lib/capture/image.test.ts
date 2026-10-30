import { describe, expect, it } from "vite-plus/test";
import { noon, openFiles, overlaps } from "./capture.fixtures.ts";
import { instantFromJpeg, instantFromPng, instantFromWebp } from "./image.ts";
import { jpegDateTime, jpegExif, pngExif, webpExif } from "../../../test/capture.fixtures.ts";

describe("instantFromJpeg", () => {
  it("DateTimeOriginal を返し、DateTime だけでは null", async () => {
    const ii = jpegExif("2024:08:02 12:00:00", "II");
    const mm = jpegExif("2024:08:02 12:00:00", "MM");
    const onlyDateTime = jpegDateTime("2024:08:02 12:00:00");
    const files = new Map<string, Uint8Array>([
      ["ii.jpg", ii],
      ["mm.jpg", mm],
      ["dated-wrong.jpg", onlyDateTime],
    ]);
    const { read } = openFiles(files);
    expect((await instantFromJpeg("ii.jpg", ii.length, read))?.toCivil()).toEqual(noon);
    expect((await instantFromJpeg("mm.jpg", mm.length, read))?.toCivil()).toEqual(noon);
    expect(await instantFromJpeg("dated-wrong.jpg", onlyDateTime.length, read)).toBeNull();
  });
});

describe("instantFromPng", () => {
  it("eXIf を読み、IDAT 本体は読まない", async () => {
    const built = pngExif("2020:03:04 05:06:07");
    const { calls, read } = openFiles(new Map([["shot.png", built.bytes]]));
    expect((await instantFromPng("shot.png", built.bytes.length, read))?.toCivil()).toEqual({
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
});

describe("instantFromWebp", () => {
  it("EXIF を読み、フレーム本体は読まない", async () => {
    const built = webpExif("2019:11:02 03:04:05");
    const { calls, read } = openFiles(new Map([["shot.webp", built.bytes]]));
    expect((await instantFromWebp("shot.webp", built.bytes.length, read))?.toCivil()).toEqual({
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

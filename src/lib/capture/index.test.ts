import { describe, expect, it } from "vite-plus/test";
import { noon, openFiles } from "./capture.fixtures.ts";
import { captureFromMtime, embeddedCapture } from "./index.ts";
import { heicExif, jpegExif, macSeconds, mp4, pngExif, webpExif } from "../../../test/capture.fixtures.ts";

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

describe("embeddedCapture", () => {
  it("gif と webm と未知の拡張子は読まない", async () => {
    const { calls, read } = openFiles(new Map());
    expect(await embeddedCapture("old.gif", 8, read)).toBeNull();
    expect(await embeddedCapture("new.webm", 8, read)).toBeNull();
    expect(await embeddedCapture("notes.txt", 8, read)).toBeNull();
    expect(calls).toEqual([]);
  });

  it("読み取りが投げたら null", async () => {
    const read = async () => {
      throw new Error("unreadable");
    };
    expect(await embeddedCapture("bad.jpg", 32, read)).toBeNull();
  });

  it("各形式のスイッチを通して暦を返す", async () => {
    const jpeg = jpegExif("2024:08:02 12:00:00");
    const png = pngExif("2024:08:02 12:00:00").bytes;
    const webp = webpExif("2024:08:02 12:00:00").bytes;
    const heic = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0));
    const video = mp4({ creationSeconds: macSeconds(2024, 8, 2, 3, 0, 0), moov: "after-mdat" }).bytes;
    const files = new Map<string, Uint8Array>([
      ["a.jpg", jpeg],
      ["a.jpeg", jpeg],
      ["a.png", png],
      ["a.webp", webp],
      ["a.heic", heic],
      ["a.heif", heic],
      ["a.avif", heic],
      ["a.mp4", video],
      ["a.mov", video],
      ["a.m4v", video],
    ]);
    const { read } = openFiles(files);
    for (const [name, bytes] of files) {
      expect(await embeddedCapture(name, bytes.length, read)).toEqual(noon);
    }
  });
});

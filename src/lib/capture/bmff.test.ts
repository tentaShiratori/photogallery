import { describe, expect, it } from "vite-plus/test";
import { instantFromBmffExif } from "./bmff.ts";
import { noon, openFiles } from "./capture.fixtures.ts";
import { heicExif, macSeconds } from "../../../test/capture.fixtures.ts";

describe("instantFromBmffExif", () => {
  it("iloc method 0 の DateTimeOriginal を使い、method 1 は null", async () => {
    const bytes = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0));
    const method1 = heicExif("2024:08:02 12:00:00", macSeconds(2010, 1, 1, 0, 0, 0), 1);
    const files = new Map<string, Uint8Array>([
      ["photo.heic", bytes],
      ["idat.heic", method1],
    ]);
    const { read } = openFiles(files);
    expect((await instantFromBmffExif("photo.heic", bytes.length, read))?.toCivil()).toEqual(noon);
    expect(await instantFromBmffExif("idat.heic", method1.length, read)).toBeNull();
  });
});

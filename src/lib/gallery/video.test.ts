import { describe, expect, it } from "vite-plus/test";
import { embeddedCapture } from "./index.ts";
import { androidKeys, creationdateKeys, openFiles, overlaps } from "./fixtures.ts";
import { macSeconds, mp4 } from "../../../test/capture-fixtures.ts";

describe("embeddedCapture", () => {
  it("mdat の後ろの mvhd を読み、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "after-mdat", wideMdat: true });
    const { calls, read } = openFiles(new Map([["tail.mov", built.bytes]]));
    expect(await embeddedCapture("tail.mov", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 3,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(calls.some((call) => overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd))).toBe(
      false,
    );
  });

  it("moov が mdat より前でも同じ時刻になり、mdat 本体は読まない", async () => {
    const creation = macSeconds(2024, 8, 2, 15, 0, 0);
    const built = mp4({ creationSeconds: creation, moov: "before-mdat" });
    const { calls, read } = openFiles(new Map([["head.m4v", built.bytes]]));
    expect(await embeddedCapture("head.m4v", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 3,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(calls.some((call) => overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd))).toBe(
      false,
    );
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
        calls.some((call) => overlaps(call.offset, call.length, built.mdatPayloadStart, built.mdatPayloadEnd)),
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
    const malformed = ["2014-09-15T18:33:31", "2014-09-15T18:33:31Z", "2014-13-15T18:33:31+0900"].map(
      (creationdate, index) => ({
        name: `bad-${index}.mp4`,
        built: mp4({
          creationSeconds: macSeconds(2023, 12, 31, 15, 0, 0),
          moov: "after-mdat",
          keys: creationdateKeys("moov", creationdate),
        }),
      }),
    );
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

  it("com.android. キーがあるときは mvhd を協定世界時の暦のままにする", async () => {
    const utc = {
      year: 2025,
      month: 12,
      day: 8,
      hour: 13,
      minute: 7,
      second: 51,
    };
    for (const where of ["moov", "udta"] as const) {
      const built = mp4({
        creationSeconds: macSeconds(2025, 12, 8, 13, 7, 51),
        moov: "after-mdat",
        keys: androidKeys(where),
      });
      const name = `pxl-android-${where}.mp4`;
      const { read } = openFiles(new Map([[name, built.bytes]]));
      expect(await embeddedCapture(name, built.bytes.length, read)).toEqual(utc);
    }
  });

  it("creationdate があれば com.android. より先に使う", async () => {
    const built = mp4({
      creationSeconds: macSeconds(2025, 12, 8, 13, 7, 51),
      moov: "after-mdat",
      keys: {
        in: "moov",
        items: [
          ["com.android.manufacturer", "Google"],
          ["com.apple.quicktime.creationdate", "2024-08-02T15:00:00-0700"],
        ] as const,
      },
    });
    const { read } = openFiles(new Map([["android-with-creationdate.mov", built.bytes]]));
    expect(await embeddedCapture("android-with-creationdate.mov", built.bytes.length, read)).toEqual({
      year: 2024,
      month: 8,
      day: 2,
      hour: 15,
      minute: 0,
      second: 0,
    });
  });

  it("com.android. があっても creation_time が 0 なら null", async () => {
    const built = mp4({
      creationSeconds: 0,
      modificationSeconds: macSeconds(1999, 6, 1, 0, 0, 0),
      moov: "after-mdat",
      keys: androidKeys("moov"),
    });
    const { read } = openFiles(new Map([["android-unset.mp4", built.bytes]]));
    expect(await embeddedCapture("android-unset.mp4", built.bytes.length, read)).toBeNull();
  });
});

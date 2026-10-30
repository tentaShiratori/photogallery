import { describe, expect, it } from "vite-plus/test";
import { fourcc, take, takeUpTo, u16, u32, u64, type RangeRead } from "./bytes.ts";

function viewOf(bytes: number[]): Uint8Array {
  const raw = new Uint8Array([0, 0, ...bytes, 0]);
  return raw.subarray(2, 2 + bytes.length);
}

describe("整数と fourcc", () => {
  const bytes = viewOf([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  it("範囲内はエンディアンどおりに読み、足りなければ null", () => {
    expect(u16(bytes, 0, false)).toBe(0x0102);
    expect(u16(bytes, 0, true)).toBe(0x0201);
    expect(u32(bytes, 0, false)).toBe(0x01020304);
    expect(u32(bytes, 4, true)).toBe(0x08070605);
    expect(u64(bytes, 0, false)).toBe(0x0102030405060708n);
    expect(u64(bytes, 0, true)).toBe(0x0807060504030201n);
    expect(fourcc(bytes, 0)).toBe("\u0001\u0002\u0003\u0004");
    expect(u16(bytes, 7, false)).toBeNull();
    expect(u32(bytes, 5, false)).toBeNull();
    expect(u64(bytes, 1, false)).toBeNull();
    expect(fourcc(bytes, 5)).toBeNull();
    for (const offset of [-1, bytes.length]) {
      expect(u16(bytes, offset, false)).toBeNull();
      expect(u32(bytes, offset, true)).toBeNull();
      expect(u64(bytes, offset, false)).toBeNull();
      expect(fourcc(bytes, offset)).toBeNull();
    }
  });
});

describe("take と takeUpTo", () => {
  it("長さが一致したときだけ take がバイトを返す", async () => {
    const read: RangeRead = async () => new Uint8Array([1, 2]);
    expect(await take(read, "k", 0, 2)).toEqual(new Uint8Array([1, 2]));
    expect(await take(read, "k", 0, 4)).toBeNull();
    expect(await takeUpTo(read, "k", 0, 4)).toEqual(new Uint8Array([1, 2]));
  });

  it("長さ 0 以下や負の位置は読みに行かない", async () => {
    let calls = 0;
    const read: RangeRead = async () => {
      calls += 1;
      return new Uint8Array([1]);
    };
    expect(await takeUpTo(read, "k", -1, 4)).toEqual(new Uint8Array());
    expect(await takeUpTo(read, "k", 0, 0)).toEqual(new Uint8Array());
    expect(await take(read, "k", 0, 0)).toEqual(new Uint8Array());
    expect(calls).toBe(0);
    expect(await takeUpTo(read, "k", 0, 1)).toEqual(new Uint8Array([1]));
    expect(calls).toBe(1);
  });
});

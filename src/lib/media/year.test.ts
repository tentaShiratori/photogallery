import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";
import { parseYear, toYear, yearQuerySchema, type YearQuery } from "./year.ts";

describe("toYear", () => {
  it("1 から 9999 の整数だけを年にする", () => {
    expect(toYear(1)).toBe(1);
    expect(toYear(9999)).toBe(9999);
    expect(toYear(0)).toBeNull();
    expect(toYear(10000)).toBeNull();
    expect(toYear(1.5)).toBeNull();
  });
});

describe("parseYear", () => {
  it("1 から 9999 の先頭 0 の無い数字だけを年にする", () => {
    expect(parseYear("2024")).toBe(2024);
    expect(parseYear("7")).toBe(7);
    expect(parseYear("9999")).toBe(9999);
    for (const raw of ["", "0", "007", "10000", "-1", "20.5", "abc", " 2024"]) {
      expect(parseYear(raw)).toBeNull();
    }
  });
});

describe("yearQuerySchema", () => {
  it("unknown と 1 から 9999 の先頭 0 の無い年だけを受け付ける", () => {
    const unknown: YearQuery = v.parse(yearQuerySchema, "unknown");
    expect(unknown).toBe("unknown");
    expect(v.parse(yearQuerySchema, "2024")).toBe(2024);
    expect(v.parse(yearQuerySchema, "7")).toBe(7);
    expect(v.parse(yearQuerySchema, "9999")).toBe(9999);
    for (const raw of ["", "0", "007", "10000", "-1", "20.5", "abc", " 2024", "UNKNOWN", "unknown "]) {
      expect(v.safeParse(yearQuerySchema, raw).success).toBe(false);
    }
  });
});

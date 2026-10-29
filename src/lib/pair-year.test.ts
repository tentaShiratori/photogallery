import { describe, expect, it } from "vite-plus/test";
import { parseYear, parseYearQuery, type YearQuery } from "./pair.ts";

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

describe("parseYearQuery", () => {
  it("unknown と 1 から 9999 の先頭 0 の無い年だけを受け付ける", () => {
    const unknown: YearQuery | null = parseYearQuery("unknown");
    expect(unknown).toBe("unknown");
    expect(parseYearQuery("2024")).toBe(2024);
    expect(parseYearQuery("7")).toBe(7);
    expect(parseYearQuery("9999")).toBe(9999);
    for (const raw of [
      "",
      "0",
      "007",
      "10000",
      "-1",
      "20.5",
      "abc",
      " 2024",
      "UNKNOWN",
      "unknown ",
    ]) {
      expect(parseYearQuery(raw)).toBeNull();
    }
  });
});

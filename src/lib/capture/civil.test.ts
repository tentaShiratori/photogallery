import { describe, expect, it } from "vite-plus/test";
import { CaptureInstant, civilFromParts } from "./civil.ts";

describe("CaptureInstant.tryCreate", () => {
  it("実在する日と閏秒を受け付ける", () => {
    expect(CaptureInstant.tryCreate(2024, 2, 29, 0, 0, 60)?.toCivil()).toEqual({
      year: 2024,
      month: 2,
      day: 29,
      hour: 0,
      minute: 0,
      second: 60,
    });
    expect(CaptureInstant.tryCreate(2000, 2, 29, 23, 59, 59)).not.toBeNull();
    expect(CaptureInstant.tryCreate(1900, 2, 28, 0, 0, 0)).not.toBeNull();
    expect(CaptureInstant.tryCreate(2024, 4, 30, 0, 0, 0)).not.toBeNull();
    expect(CaptureInstant.tryCreate(2024, 1, 31, 0, 0, 0)).not.toBeNull();
    expect(CaptureInstant.tryCreate(1, 1, 1, 0, 0, 0)).not.toBeNull();
    expect(CaptureInstant.tryCreate(9999, 12, 31, 23, 59, 60)).not.toBeNull();
  });

  it("存在しない日と範囲外の数は null", () => {
    const bad = [
      [2023, 2, 29, 0, 0, 0],
      [1900, 2, 29, 0, 0, 0],
      [2024, 2, 30, 0, 0, 0],
      [2024, 4, 31, 0, 0, 0],
      [2024, 0, 1, 0, 0, 0],
      [2024, 13, 1, 0, 0, 0],
      [2024, 1, 0, 0, 0, 0],
      [2024, 1, 32, 0, 0, 0],
      [0, 1, 1, 0, 0, 0],
      [10000, 1, 1, 0, 0, 0],
      [2024, 1, 1, 24, 0, 0],
      [2024, 1, 1, -1, 0, 0],
      [2024, 1, 1, 0, 60, 0],
      [2024, 1, 1, 0, -1, 0],
      [2024, 1, 1, 0, 0, 61],
      [2024, 1, 1, 0, 0, -1],
      [2024.5, 1, 1, 0, 0, 0],
      [2024, 1.5, 1, 0, 0, 0],
      [Number.NaN, 1, 1, 0, 0, 0],
    ];
    for (const [year, month, day, hour, minute, second] of bad) {
      expect(CaptureInstant.tryCreate(year!, month!, day!, hour!, minute!, second!)).toBeNull();
    }
  });
});

describe("civilFromParts", () => {
  it("同じ判定で暦か null を返す", () => {
    expect(civilFromParts(2024, 2, 29, 1, 2, 3)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
      hour: 1,
      minute: 2,
      second: 3,
    });
    expect(civilFromParts(2023, 2, 29, 0, 0, 0)).toBeNull();
  });
});

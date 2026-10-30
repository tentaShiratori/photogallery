import { afterEach, describe, expect, it } from "vite-plus/test";
import { readYearFromLocation, writeYearToLocation, yearTokenFromLabel } from "./location";

describe("year-list/location", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("年不明は unknown トークンにする", () => {
    expect(yearTokenFromLabel("年不明")).toBe("unknown");
    expect(yearTokenFromLabel("2024")).toBe("2024");
  });

  it("location の year を読み書きする", () => {
    expect(readYearFromLocation()).toBeNull();
    writeYearToLocation("2024");
    expect(readYearFromLocation()).toBe("2024");
    writeYearToLocation(null, true);
    expect(readYearFromLocation()).toBeNull();
  });
});

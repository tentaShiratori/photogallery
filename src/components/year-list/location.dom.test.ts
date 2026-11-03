import { describe, expect, it } from "vite-plus/test";
import { yearTokenFromLabel } from "./location";

describe("year-list/location", () => {
  it("年不明は unknown トークンにする", () => {
    expect(yearTokenFromLabel("年不明")).toBe("unknown");
    expect(yearTokenFromLabel("2024")).toBe("2024");
  });
});

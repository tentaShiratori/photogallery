import { describe, expect, it } from "vite-plus/test";
import { markEnlarged } from "./perf";

describe("enlarged/perf", () => {
  it("performance に mark を付ける", () => {
    performance.clearMarks();
    markEnlarged.open();
    markEnlarged.ready();
    expect(performance.getEntriesByName("enlarged-open").length).toBe(1);
    expect(performance.getEntriesByName("enlarged-ready").length).toBe(1);
  });
});

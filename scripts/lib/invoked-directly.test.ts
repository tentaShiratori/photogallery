import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { invokedDirectly } from "./invoked-directly.ts";

describe("invokedDirectly", () => {
  it("エントリがモジュール URL と一致するとき true", () => {
    const entry = "/workspace/scripts/upload-local.ts";
    expect(invokedDirectly(pathToFileURL(entry).href, entry)).toBe(true);
  });

  it("別ファイルや空のエントリでは false", () => {
    expect(invokedDirectly("file:///workspace/scripts/upload-local.ts", "/workspace/scripts/perf.ts")).toBe(false);
    expect(invokedDirectly("file:///workspace/scripts/upload-local.ts", "")).toBe(false);
    expect(invokedDirectly("file:///workspace/scripts/upload-local.ts", undefined)).toBe(false);
  });
});

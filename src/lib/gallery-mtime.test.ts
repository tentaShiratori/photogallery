import { describe, expect, it } from "vite-plus/test";
import { captureFromMtime } from "./gallery.ts";

describe("captureFromMtime", () => {
  it("アップロードより 7 日より古い更新日時を現地の暦にする", () => {
    const mtime = new Date("2014-07-23T03:01:10.000Z");
    const now = new Date("2026-10-18T00:00:00.000Z");
    expect(captureFromMtime(mtime, now)).toEqual({
      year: mtime.getFullYear(),
      month: mtime.getMonth() + 1,
      day: mtime.getDate(),
      hour: mtime.getHours(),
      minute: mtime.getMinutes(),
      second: mtime.getSeconds(),
    });
  });

  it("アップロードの 7 日以内の更新日時は null", () => {
    const now = new Date("2026-10-18T00:00:00.000Z");
    const recent = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const exact = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const older = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(captureFromMtime(recent, now)).toBeNull();
    expect(captureFromMtime(exact, now)).toBeNull();
    expect(captureFromMtime(older, now)?.year).toBe(older.getFullYear());
  });
});

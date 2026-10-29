import { describe, expect, it } from "vite-plus/test";
import {
  parseYearListResponse,
  parseYearScreenResponse,
  type YearListResponse,
  type YearScreenResponse,
} from "./media-response.ts";

function item(label: string, i: number) {
  return {
    bodyKey: `${label}-${i}.jpg`,
    kind: "image" as const,
    bodyUrl: `/media/${label}-${i}.jpg`,
    thumbUrl: `/media/t/${label}-${i}.webp`,
    caption: `${label}-${i}.jpg`,
  };
}

describe("parseYearListResponse", () => {
  it("年カードの一覧を受け取る", () => {
    const input = {
      years: [{ label: "2024", previews: [item("2024", 0), item("2024", 1)] }],
    };
    const parsed: YearListResponse = parseYearListResponse(input);
    expect(parsed).toEqual(input);
  });

  it("プレビューは 4 件まで", () => {
    expect(
      parseYearListResponse({
        years: [{ label: "2024", previews: Array.from({ length: 4 }, (_, i) => item("2024", i)) }],
      }).years[0]?.previews,
    ).toHaveLength(4);
    expect(() =>
      parseYearListResponse({
        years: [{ label: "2024", previews: Array.from({ length: 5 }, (_, i) => item("2024", i)) }],
      }),
    ).toThrow("一覧の形が違います。");
  });

  it("形が違うと日本語のエラー", () => {
    for (const bad of [null, {}, { years: null }, { years: [{ label: 1, previews: [] }] }]) {
      expect(() => parseYearListResponse(bad)).toThrow("一覧の形が違います。");
    }
  });
});

describe("parseYearScreenResponse", () => {
  it("1 年分と空の組を受け取る", () => {
    const withItems: YearScreenResponse = parseYearScreenResponse({
      group: { label: "2024", truncated: false, items: [item("2024", 0)] },
      next: null,
    });
    expect(withItems.group?.items).toHaveLength(1);
    expect(parseYearScreenResponse({ group: null, next: null })).toEqual({
      group: null,
      next: null,
    });
  });

  it("形が違うと日本語のエラー", () => {
    for (const bad of [
      null,
      { group: null, next: "/api/media?after=2024" },
      { group: { label: "2024", truncated: false, items: [] }, next: null },
    ]) {
      expect(() => parseYearScreenResponse(bad)).toThrow("一覧の形が違います。");
    }
  });
});

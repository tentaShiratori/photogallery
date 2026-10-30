import { describe, expect, it } from "vite-plus/test";
import { parseYearListResponse, parseYearScreenResponse } from "../../lib/media-response.ts";
import {
  initialYearList,
  initialYearScreen,
  yearApiHref,
  yearListReducer,
  yearListView,
  yearScreenReducer,
  yearScreenStep,
  yearScreenView,
  type Href,
} from "./feed.ts";

function item(label: string, i: number) {
  return {
    bodyKey: `${label}-${i}.jpg`,
    kind: "image" as const,
    bodyUrl: `/media/${label}-${i}.jpg` as const,
    thumbUrl: `/media/t/${label}-${i}.webp` as const,
    caption: `${label}-${i}.jpg`,
  };
}

function wireYear(label: string, count: number, truncated = false) {
  const items = Array.from({ length: count }, (_, i) => item(label, i));
  const [first, ...rest] = items;
  if (first === undefined) throw new Error("count");
  return {
    group: { label, truncated, items: [first, ...rest] },
    next: null,
  };
}

function wireList(cards: { label: string; previews: number }[]) {
  return {
    years: cards.map((card) => ({
      label: card.label,
      previews: Array.from({ length: card.previews }, (_, i) => item(card.label, i)),
    })),
  };
}

describe("year list", () => {
  it("最初は読み込み中で、空の一覧を出す", () => {
    expect(yearListView(initialYearList)).toEqual({
      status: "読み込み中です。",
      years: [],
    });
  });

  it("年カードが来たら見出しの文言は出さずカードだけ出す", () => {
    const state = yearListReducer(initialYearList, {
      type: "loaded",
      years: parseYearListResponse(wireList([{ label: "2024", previews: 2 }])).years,
    });
    expect(yearListView(state)).toEqual({
      status: null,
      years: [{ label: "2024", previews: [item("2024", 0), item("2024", 1)] }],
    });
  });

  it("失敗すると一覧を取得できませんでした。", () => {
    const state = yearListReducer(initialYearList, { type: "failed" });
    expect(yearListView(state)).toEqual({
      status: "一覧を取得できませんでした。",
      years: [],
    });
  });

  it("カードが無ければ空の文言を出す", () => {
    const state = yearListReducer(initialYearList, { type: "loaded", years: [] });
    expect(yearListView(state)).toEqual({
      status: "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。",
      years: [],
    });
  });

  it("プレビューは 4 件まで受け取る", () => {
    expect(parseYearListResponse(wireList([{ label: "2024", previews: 4 }])).years[0]?.previews).toHaveLength(4);
    expect(() => parseYearListResponse(wireList([{ label: "2024", previews: 5 }]))).toThrow();
  });
});

describe("year screen", () => {
  it("最初は読み込み中", () => {
    expect(yearScreenView(initialYearScreen)).toMatchObject({
      status: "読み込み中です。",
      tiles: [],
    });
    expect(yearApiHref("2024")).toBe("/api/media?year=2024");
    expect(yearApiHref("unknown")).toBe("/api/media?year=unknown");
  });

  it("年の 60 件まで出し、下まで来たら残りを通信せずに出す", () => {
    let feed = yearScreenReducer(initialYearScreen, {
      type: "loaded",
      href: "/api/media?year=2024" as Href,
      screen: parseYearScreenResponse(wireYear("2024", 75)),
    });
    let view = yearScreenView(feed);
    expect(view.status).toBeNull();
    expect(view.label).toBe("2024");
    expect(view.notice).toBeNull();
    expect(view.tiles).toHaveLength(60);
    expect(yearScreenStep(feed, false)).toEqual({ kind: "wait" });
    expect(yearScreenStep(feed, true)).toEqual({ kind: "reveal" });

    feed = yearScreenReducer(feed, { type: "reveal" });
    view = yearScreenView(feed);
    expect(view.tiles).toHaveLength(75);
    expect(yearScreenStep(feed, true)).toEqual({ kind: "wait" });
  });

  it("件数は出さず、上限のときだけ見出しの横に付ける", () => {
    const feed = yearScreenReducer(initialYearScreen, {
      type: "loaded",
      href: "/api/media?year=2024" as Href,
      screen: parseYearScreenResponse(wireYear("2024", 3, true)),
    });
    const view = yearScreenView(feed);
    expect(view.notice).toBe("（上限で打ち切っています）");
    expect(JSON.stringify(view)).not.toContain("件");
  });

  it("組が無い年は空の文言", () => {
    const feed = yearScreenReducer(initialYearScreen, {
      type: "loaded",
      href: "/api/media?year=2024" as Href,
      screen: parseYearScreenResponse({ group: null, next: null }),
    });
    expect(yearScreenView(feed).status).toBe(
      "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。",
    );
  });

  it("取得に失敗すると一覧を取得できませんでした。", () => {
    const feed = yearScreenReducer(initialYearScreen, {
      type: "failed",
      href: "/api/media?year=2024" as Href,
    });
    expect(yearScreenView(feed).status).toBe("一覧を取得できませんでした。");
  });

  it("形の違う応答は受け取らない", () => {
    const good = wireYear("2024", 1);
    expect(parseYearScreenResponse(good).group?.items).toHaveLength(1);
    expect(parseYearScreenResponse({ group: null, next: null })).toEqual({ group: null, next: null });
    for (const bad of [
      null,
      { group: null, next: "/api/media?after=2024" },
      { ...good, group: { ...good.group, items: [] } },
    ]) {
      expect(() => parseYearScreenResponse(bad)).toThrow();
    }
  });
});

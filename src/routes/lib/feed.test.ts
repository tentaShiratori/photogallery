import { describe, expect, it } from "vite-plus/test";
import {
  feedReducer,
  feedView,
  initialFeed,
  nextStep,
  parsePage,
  type Feed,
  type Href,
} from "./feed.ts";

function wire(label: string, count: number, next: string | null, truncated = false) {
  return {
    group: {
      label,
      truncated,
      items: Array.from({ length: count }, (_, i) => ({
        bodyKey: `${label}-${i}.jpg`,
        kind: "image",
        bodyUrl: `/media/${label}-${i}.jpg`,
        thumbUrl: `/media/t/${label}-${i}.webp`,
        caption: `${label}-${i}.jpg`,
      })),
    },
    next,
  };
}

function fetched(feed: Feed): { feed: Feed; href: Href } {
  const step = nextStep(feed, true);
  if (step.kind !== "fetch") throw new Error(`expected fetch, got ${step.kind}`);
  return { feed: feedReducer(feed, { type: "fetch" }), href: step.href };
}

function load(feed: Feed, body: unknown): Feed {
  const { feed: loading, href } = fetched(feed);
  return feedReducer(loading, { type: "loaded", href, page: parsePage(body) });
}

function fail(feed: Feed): Feed {
  const { feed: loading, href } = fetched(feed);
  return feedReducer(loading, { type: "failed", href });
}

describe("feed", () => {
  it("最初は読み込み中で、画面の下を待たずに /api/media を取りに行く", () => {
    expect(feedView(initialFeed)).toEqual({
      status: "読み込み中です。",
      groups: [],
      moreFailed: false,
    });
    expect(nextStep(initialFeed, false)).toEqual({ kind: "fetch", href: "/api/media" });
  });

  it("年の 60 件までを見出しと件数付きで出し、下まで来たら残りを通信せずに出す", () => {
    let feed = load(initialFeed, wire("2024", 75, "/api/media?after=2024"));
    let view = feedView(feed);
    expect(view.status).toBeNull();
    expect(view.groups.map((group) => [group.label, group.count])).toEqual([["2024", "75 件"]]);
    expect(view.groups[0]?.tiles).toHaveLength(60);
    expect(view.groups[0]?.tiles[0]?.bodyKey).toBe("2024-0.jpg");
    expect(nextStep(feed, false)).toEqual({ kind: "wait" });
    expect(nextStep(feed, true)).toEqual({ kind: "reveal" });

    feed = feedReducer(feed, { type: "reveal" });
    view = feedView(feed);
    expect(view.groups[0]?.tiles).toHaveLength(75);
    expect(nextStep(feed, true)).toEqual({ kind: "fetch", href: "/api/media?after=2024" });
  });

  it("次の年は下まで来たら 60 件ずつ足し、見出しはその年のタイルと一緒に出る", () => {
    let feed = load(initialFeed, wire("2024", 12, "/api/media?after=2024"));
    expect(nextStep(feed, false)).toEqual({ kind: "wait" });
    feed = load(feed, wire("2023", 100, "/api/media?after=2023"));
    const view = feedView(feed);
    expect(view.groups.map((group) => [group.label, group.count, group.tiles.length])).toEqual([
      ["2024", "12 件", 12],
      ["2023", "100 件", 60],
    ]);
  });

  it("組の無い年は何も出さず、下を待たずに次を取りに行く", () => {
    const feed = load(initialFeed, { group: null, next: "/api/media?after=2022" });
    expect(feedView(feed)).toEqual({ status: "読み込み中です。", groups: [], moreFailed: false });
    expect(nextStep(feed, false)).toEqual({ kind: "fetch", href: "/api/media?after=2022" });
  });

  it("上限で打ち切った年は、その見出しの件数のうしろに付ける", () => {
    const feed = load(initialFeed, wire("2024", 3, null, true));
    const view = feedView(feed);
    expect(view.status).toBeNull();
    expect(view.groups[0]?.count).toBe("3 件（上限で打ち切っています）");
  });

  it("続きに失敗するとタイルを残し、もう一度で同じ続きだけを取り直す", () => {
    let feed = load(initialFeed, wire("2024", 5, "/api/media?after=2024"));
    feed = fail(feed);
    const view = feedView(feed);
    expect(view.status).toBeNull();
    expect(view.moreFailed).toBe(true);
    expect(view.groups[0]?.tiles).toHaveLength(5);
    expect(nextStep(feed, true)).toEqual({ kind: "wait" });

    feed = feedReducer(feed, { type: "retry" });
    expect(feedView(feed).moreFailed).toBe(false);
    expect(nextStep(feed, true)).toEqual({ kind: "fetch", href: "/api/media?after=2024" });
    feed = load(feed, wire("2023", 2, null));
    expect(feedView(feed).groups.map((group) => group.label)).toEqual(["2024", "2023"]);
  });

  it("タイルが出る前に失敗すると、一覧を取得できませんでした。だけを出す", () => {
    const feed = fail(initialFeed);
    expect(feedView(feed)).toEqual({
      status: "一覧を取得できませんでした。",
      groups: [],
      moreFailed: false,
    });
    expect(nextStep(feed, true)).toEqual({ kind: "wait" });
  });

  it("どの年にも組が無ければ空の文言を出す", () => {
    let feed = load(initialFeed, { group: null, next: "/api/media?after=2022" });
    feed = load(feed, { group: null, next: null });
    expect(feedView(feed)).toEqual({
      status: "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。",
      groups: [],
      moreFailed: false,
    });
  });

  it("最後まで出したら何も足さず、取りに行かない", () => {
    const feed = load(initialFeed, wire("年不明", 2, null));
    expect(feedView(feed)).toMatchObject({ status: null, moreFailed: false });
    expect(nextStep(feed, true)).toEqual({ kind: "wait" });
  });

  it("前の続きへの遅れた応答は捨てる", () => {
    const first = fetched(initialFeed);
    let feed = feedReducer(first.feed, {
      type: "loaded",
      href: first.href,
      page: parsePage(wire("2024", 1, "/api/media?after=2024")),
    });
    const second = fetched(feed);
    feed = feedReducer(second.feed, {
      type: "loaded",
      href: first.href,
      page: parsePage(wire("2024", 1, "/api/media?after=2024")),
    });
    feed = feedReducer(feed, { type: "failed", href: first.href });
    expect(feed).toBe(second.feed);
    expect(feedView(feed).groups.map((group) => group.label)).toEqual(["2024"]);
  });

  it("形の違う応答は受け取らない", () => {
    const good = wire("2024", 1, "/api/media?after=2024");
    expect(parsePage(good).group?.items).toHaveLength(1);
    expect(parsePage({ group: null, next: null })).toEqual({ group: null, next: null });
    for (const bad of [
      null,
      [],
      { group: null },
      { ...good, next: "https://example.com/api/media?after=2024" },
      { ...good, group: { ...good.group, items: [] } },
      { ...good, group: { label: "2024", items: good.group.items } },
      { ...good, group: { ...good.group, items: [{ ...good.group.items[0], kind: "audio" }] } },
    ]) {
      expect(() => parsePage(bad)).toThrow();
    }
  });
});

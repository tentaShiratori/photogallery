import type { MediaKind } from "../../lib/media";
import type { BodyUrl, ThumbUrl } from "../../lib/pair";

const STEP = 60;
const LOADING = "読み込み中です。";
const LIST_FAILED = "一覧を取得できませんでした。";
const EMPTY = "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。";
const COUNT_TRUNCATED = "（上限で打ち切っています）";
export const MORE_FAILED = "続きを取得できませんでした。";
export const RETRY = "もう一度";

declare const hrefBrand: unique symbol;

/** A listing URL fetched verbatim. Only the first one is written by hand. */
export type Href = string & { readonly [hrefBrand]: "Href" };

export type ParsedMedia = {
  readonly bodyKey: string;
  readonly kind: MediaKind;
  readonly bodyUrl: BodyUrl;
  readonly thumbUrl: ThumbUrl;
  readonly caption: string;
};

export type ParsedGroup = {
  readonly label: string;
  readonly truncated: boolean;
  readonly items: readonly [ParsedMedia, ...ParsedMedia[]];
};

export type ParsedPage = {
  readonly group: ParsedGroup | null;
  readonly next: Href | null;
};

function shapeError(): never {
  throw new Error("一覧の形が違います。");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBodyUrl(value: unknown): value is BodyUrl {
  return typeof value === "string" && value.length > 0;
}

function isThumbUrl(value: unknown): value is ThumbUrl {
  return typeof value === "string" && value.length > 0;
}

function isHref(value: unknown): value is Href {
  return typeof value === "string" && value.startsWith("/api/media?");
}

function parseItem(value: unknown): ParsedMedia {
  if (!isRecord(value)) return shapeError();
  const kind = value.kind;
  if (kind !== "image" && kind !== "video") return shapeError();
  if (typeof value.bodyKey !== "string" || value.bodyKey.length === 0) return shapeError();
  if (typeof value.caption !== "string" || value.caption.length === 0) return shapeError();
  if (!isBodyUrl(value.bodyUrl) || !isThumbUrl(value.thumbUrl)) return shapeError();
  return {
    bodyKey: value.bodyKey,
    kind,
    bodyUrl: value.bodyUrl,
    thumbUrl: value.thumbUrl,
    caption: value.caption,
  };
}

function parseGroup(value: unknown): ParsedGroup {
  if (!isRecord(value) || typeof value.label !== "string") return shapeError();
  if (typeof value.truncated !== "boolean" || !Array.isArray(value.items)) return shapeError();
  const [first, ...rest] = value.items.map(parseItem);
  if (first === undefined) return shapeError();
  return { label: value.label, truncated: value.truncated, items: [first, ...rest] };
}

/** Strict parse of one `GET /api/media` body. Throws on any shape error. */
export function parsePage(input: unknown): ParsedPage {
  if (!isRecord(input)) return shapeError();
  const next = input.next === null ? null : isHref(input.next) ? input.next : shapeError();
  return { group: input.group === null ? null : parseGroup(input.group), next };
}

/** Where the next group comes from. The href lives in the state that needs it. */
export type Tail =
  | { readonly kind: "pending"; readonly href: Href }
  | { readonly kind: "loading"; readonly href: Href }
  | { readonly kind: "failed"; readonly href: Href }
  | { readonly kind: "end" };

/**
 * The screen is the first `shown` tiles of `groups` in order. A loaded group always reveals at
 * least one tile, so `shown` is 0 exactly when no group has arrived.
 */
export type Feed = {
  readonly groups: readonly ParsedGroup[];
  readonly shown: number;
  readonly tail: Tail;
};

export const initialFeed: Feed = {
  groups: [],
  shown: 0,
  tail: { kind: "pending", href: "/api/media" as Href },
};

export type FeedEvent =
  | { readonly type: "reveal" }
  | { readonly type: "fetch" }
  | { readonly type: "loaded"; readonly href: Href; readonly page: ParsedPage }
  | { readonly type: "failed"; readonly href: Href }
  | { readonly type: "retry" };

function tileCount(groups: readonly ParsedGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

/** Each event is a no-op outside its source state, so a stray or late event cannot corrupt the feed. */
export function feedReducer(feed: Feed, event: FeedEvent): Feed {
  const { tail } = feed;
  switch (event.type) {
    case "reveal":
      return { ...feed, shown: Math.min(feed.shown + STEP, tileCount(feed.groups)) };
    case "fetch":
      return tail.kind === "pending"
        ? { ...feed, tail: { kind: "loading", href: tail.href } }
        : feed;
    case "loaded": {
      if (tail.kind !== "loading" || tail.href !== event.href) return feed;
      const { group, next } = event.page;
      const groups = group ? [...feed.groups, group] : feed.groups;
      return {
        groups,
        shown: Math.min(feed.shown + STEP, tileCount(groups)),
        tail: next === null ? { kind: "end" } : { kind: "pending", href: next },
      };
    }
    case "failed":
      return tail.kind === "loading" && tail.href === event.href
        ? { ...feed, tail: { kind: "failed", href: tail.href } }
        : feed;
    case "retry":
      return tail.kind === "failed"
        ? { ...feed, tail: { kind: "pending", href: tail.href } }
        : feed;
  }
}

export type Step =
  | { readonly kind: "reveal" }
  | { readonly kind: "fetch"; readonly href: Href }
  | { readonly kind: "wait" };

/**
 * The scroll policy. Hidden tiles are revealed before anything is fetched. With nothing on
 * screen, the feed fetches without waiting for the bottom, so empty years are skipped at once.
 */
export function nextStep(feed: Feed, nearBottom: boolean): Step {
  if (feed.shown > 0 && !nearBottom) return { kind: "wait" };
  if (feed.shown < tileCount(feed.groups)) return { kind: "reveal" };
  return feed.tail.kind === "pending" ? { kind: "fetch", href: feed.tail.href } : { kind: "wait" };
}

export type VisibleGroup = {
  readonly label: string;
  /** The heading's full count, not the visible one. */
  readonly count: string;
  readonly tiles: readonly ParsedMedia[];
};

export type FeedView = {
  /** Whole-gallery status, or null once any tile is on screen. */
  readonly status: string | null;
  readonly groups: readonly VisibleGroup[];
  readonly moreFailed: boolean;
};

const STATUS_BEFORE_TILES = {
  pending: LOADING,
  loading: LOADING,
  failed: LIST_FAILED,
  end: EMPTY,
} as const satisfies Record<Tail["kind"], string>;

export function feedView(feed: Feed): FeedView {
  const groups: VisibleGroup[] = [];
  let left = feed.shown;
  for (const group of feed.groups) {
    if (left === 0) break;
    const tiles = group.items.slice(0, left);
    left -= tiles.length;
    const count = `${group.items.length} 件${group.truncated ? COUNT_TRUNCATED : ""}`;
    groups.push({ label: group.label, count, tiles });
  }
  return {
    status: feed.shown > 0 ? null : STATUS_BEFORE_TILES[feed.tail.kind],
    groups,
    moreFailed: feed.shown > 0 && feed.tail.kind === "failed",
  };
}

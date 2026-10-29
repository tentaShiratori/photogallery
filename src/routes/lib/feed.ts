import {
  parseYearListResponse,
  parseYearScreenResponse,
  type MediaItem,
  type YearCardResponse,
  type YearGroupResponse,
  type YearListResponse,
  type YearScreenResponse,
} from "../../lib/media-response.ts";

const STEP = 60;
const LOADING = "読み込み中です。";
const LIST_FAILED = "一覧を取得できませんでした。";
const EMPTY = "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。";
const COUNT_TRUNCATED = "（上限で打ち切っています）";
export const MORE_FAILED = "続きを取得できませんでした。";
export const RETRY = "もう一度";

declare const hrefBrand: unique symbol;

/** A listing URL fetched verbatim. */
export type Href = string & { readonly [hrefBrand]: "Href" };

export type ParsedMedia = MediaItem;
export type ParsedGroup = YearGroupResponse;
export type ParsedYearCard = YearCardResponse;

export function parseYearList(input: unknown): YearListResponse {
  return parseYearListResponse(input);
}

export type ParsedYearScreen = YearScreenResponse;

export function parseYearScreen(input: unknown): ParsedYearScreen {
  return parseYearScreenResponse(input);
}

export type YearListState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly years: readonly ParsedYearCard[] };

export const initialYearList: YearListState = { status: "loading" };

export type YearListEvent =
  | { readonly type: "loaded"; readonly years: readonly ParsedYearCard[] }
  | { readonly type: "failed" };

export function yearListReducer(state: YearListState, event: YearListEvent): YearListState {
  switch (event.type) {
    case "loaded":
      return { status: "ready", years: event.years };
    case "failed":
      return state.status === "loading" ? { status: "failed" } : state;
  }
}

export type YearListView = {
  readonly status: string | null;
  readonly years: readonly ParsedYearCard[];
};

export function yearListView(state: YearListState): YearListView {
  switch (state.status) {
    case "loading":
      return { status: LOADING, years: [] };
    case "failed":
      return { status: LIST_FAILED, years: [] };
    case "ready":
      return state.years.length === 0
        ? { status: EMPTY, years: [] }
        : { status: null, years: state.years };
  }
}

export type YearScreenFeed = {
  readonly status: "loading" | "failed" | "ready";
  readonly group: ParsedGroup | null;
  readonly shown: number;
};

export const initialYearScreen: YearScreenFeed = {
  status: "loading",
  group: null,
  shown: 0,
};

export type YearScreenEvent =
  | { readonly type: "reset" }
  | { readonly type: "loaded"; readonly href: Href; readonly screen: ParsedYearScreen }
  | { readonly type: "failed"; readonly href: Href }
  | { readonly type: "reveal" };

function tileCount(group: ParsedGroup | null): number {
  return group?.items.length ?? 0;
}

export function yearScreenReducer(feed: YearScreenFeed, event: YearScreenEvent): YearScreenFeed {
  switch (event.type) {
    case "reset":
      return initialYearScreen;
    case "loaded": {
      if (feed.status !== "loading") return feed;
      const { group } = event.screen;
      if (group === null) return { status: "ready", group: null, shown: 0 };
      return {
        status: "ready",
        group,
        shown: Math.min(STEP, group.items.length),
      };
    }
    case "failed":
      return feed.status === "loading" ? { status: "failed", group: null, shown: 0 } : feed;
    case "reveal":
      if (feed.status !== "ready" || feed.group === null) return feed;
      return {
        ...feed,
        shown: Math.min(feed.shown + STEP, feed.group.items.length),
      };
  }
}

export type YearScreenStep = { readonly kind: "reveal" } | { readonly kind: "wait" };

export function yearScreenStep(feed: YearScreenFeed, nearBottom: boolean): YearScreenStep {
  if (feed.status !== "ready" || feed.group === null) return { kind: "wait" };
  if (feed.shown > 0 && !nearBottom) return { kind: "wait" };
  if (feed.shown < tileCount(feed.group)) return { kind: "reveal" };
  return { kind: "wait" };
}

export type YearScreenView = {
  readonly status: string | null;
  readonly label: string | null;
  readonly notice: string | null;
  readonly tiles: readonly ParsedMedia[];
  readonly loadFailed: boolean;
};

export function yearScreenView(feed: YearScreenFeed): YearScreenView {
  if (feed.status === "loading") {
    return { status: LOADING, label: null, notice: null, tiles: [], loadFailed: false };
  }
  if (feed.status === "failed") {
    return { status: LIST_FAILED, label: null, notice: null, tiles: [], loadFailed: false };
  }
  if (feed.group === null) {
    return { status: EMPTY, label: null, notice: null, tiles: [], loadFailed: false };
  }
  return {
    status: null,
    label: feed.group.label,
    notice: feed.group.truncated ? COUNT_TRUNCATED : null,
    tiles: feed.group.items.slice(0, feed.shown),
    loadFailed: false,
  };
}

export function yearApiHref(yearToken: string): Href {
  return `/api/media?year=${yearToken}` as Href;
}

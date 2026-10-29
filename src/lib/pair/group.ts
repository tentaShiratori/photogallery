import type { CivilCapture } from "../gallery/index.ts";
import { captureFromKey, classify, kindOfBody, thumbKeyFor, urlForBody, urlForThumb } from "./stem.ts";
import { mediaSeal, type BodyKey, type Media, type Stem, type ThumbKey, type Year, type YearGroup } from "./types.ts";

export type GroupId = { readonly kind: "year"; readonly year: Year } | { readonly kind: "unknown" };

export type BucketHead = {
  readonly key: string;
  readonly size: number;
  readonly uploaded: string;
};

export const UNKNOWN_LABEL = "年不明";

/** Year-list cards show at most this many thumbnails (R-GAL-10). */
const PREVIEW_COUNT = 4;

type Ranked = {
  readonly media: Media;
  readonly captured: CivilCapture | null;
  readonly uploaded: string;
};

type DatedRanked = Ranked & { readonly captured: CivilCapture };

type Slot =
  | { readonly status: "empty" }
  | { readonly status: "body"; readonly head: BucketHead; readonly bodyKey: BodyKey }
  | { readonly status: "thumb"; readonly thumbKey: ThumbKey }
  | { readonly status: "pair"; readonly head: BucketHead; readonly bodyKey: BodyKey }
  | { readonly status: "conflict" };

function matchedPair(head: BucketHead, bodyKey: BodyKey, thumbKey: ThumbKey): Slot | null {
  if (thumbKey !== thumbKeyFor(bodyKey)) return null;
  return { status: "pair", head, bodyKey };
}

function seeBody(slot: Slot, head: BucketHead, bodyKey: BodyKey): Slot {
  switch (slot.status) {
    case "empty":
      return { status: "body", head, bodyKey };
    case "thumb":
      return matchedPair(head, bodyKey, slot.thumbKey) ?? slot;
    case "body":
    case "pair":
    case "conflict":
      return { status: "conflict" };
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function seeThumb(slot: Slot, thumbKey: ThumbKey): Slot {
  switch (slot.status) {
    case "empty":
      return { status: "thumb", thumbKey };
    case "body":
      return matchedPair(slot.head, slot.bodyKey, thumbKey) ?? slot;
    case "thumb":
    case "pair":
    case "conflict":
      return slot;
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function mediaFromPair(head: BucketHead, bodyKey: BodyKey): Ranked {
  const media: Media = {
    [mediaSeal]: "Media",
    bodyKey,
    kind: kindOfBody(bodyKey),
    bodyUrl: urlForBody(bodyKey),
    thumbUrl: urlForThumb(thumbKeyFor(bodyKey)),
    caption: bodyKey,
  };
  return {
    media,
    captured: captureFromKey(bodyKey),
    uploaded: head.uploaded,
  };
}

function isDated(item: Ranked): item is DatedRanked {
  return item.captured !== null;
}

function compareDated(a: DatedRanked, b: DatedRanked): number {
  const left = a.captured;
  const right = b.captured;
  const byCivil =
    right.year - left.year ||
    right.month - left.month ||
    right.day - left.day ||
    right.hour - left.hour ||
    right.minute - left.minute ||
    right.second - left.second;
  if (byCivil !== 0) return byCivil;
  return b.uploaded.localeCompare(a.uploaded) || a.media.bodyKey.localeCompare(b.media.bodyKey);
}

function compareUnknown(a: Ranked, b: Ranked): number {
  return b.uploaded.localeCompare(a.uploaded) || a.media.bodyKey.localeCompare(b.media.bodyKey);
}

function slotsFromHeads(heads: readonly BucketHead[]): Map<Stem, Slot> {
  const slots = new Map<Stem, Slot>();
  for (const head of heads) {
    const found = classify(head.key);
    if (!found) continue;
    const current = slots.get(found.stem) ?? { status: "empty" };
    const next = found.role === "body" ? seeBody(current, head, found.bodyKey) : seeThumb(current, found.thumbKey);
    slots.set(found.stem, next);
  }
  return slots;
}

function pairsFromHeads(heads: readonly BucketHead[]): Ranked[] {
  const ranked: Ranked[] = [];
  for (const slot of slotsFromHeads(heads).values()) {
    if (slot.status === "pair") ranked.push(mediaFromPair(slot.head, slot.bodyKey));
  }
  return ranked;
}

export function groupFromHeads(id: GroupId, heads: readonly BucketHead[], truncated: boolean): YearGroup | null {
  const ranked = pairsFromHeads(heads);
  const items =
    id.kind === "year"
      ? ranked
          .filter(isDated)
          .filter((item) => item.captured.year === id.year)
          .sort(compareDated)
      : ranked.filter((item) => !isDated(item)).sort(compareUnknown);
  const [first, ...rest] = items.map((item) => item.media);
  if (first === undefined) return null;
  const label = id.kind === "year" ? String(id.year) : UNKNOWN_LABEL;
  return { label, truncated, items: [first, ...rest] };
}

export function previewMediasFromHeads(id: GroupId, heads: readonly BucketHead[]): readonly Media[] {
  const ranked = pairsFromHeads(heads);
  const items =
    id.kind === "year"
      ? ranked.filter(isDated).filter((item) => item.captured.year === id.year)
      : ranked.filter((item) => !isDated(item));
  return [...items]
    .map((item) => item.media)
    .sort((left, right) => left.bodyKey.localeCompare(right.bodyKey))
    .slice(0, PREVIEW_COUNT);
}

/**
 * True when the first {@link PREVIEW_COUNT} bodyKey-ordered pairs cannot change
 * with further list pages: every body at or before the cutoff was seen, and any
 * body-only slot at or before the cutoff can no longer gain a thumb.
 */
export function previewPairsStable(
  id: GroupId,
  heads: readonly BucketHead[],
  previews: readonly Media[],
  bodySide: { readonly open: boolean; readonly lastKey: string },
  thumbSide: { readonly open: boolean; readonly lastKey: string },
): boolean {
  if (previews.length < PREVIEW_COUNT) return false;
  const cutoff = previews[PREVIEW_COUNT - 1]!.bodyKey;
  if (bodySide.open && bodySide.lastKey < cutoff) return false;
  for (const slot of slotsFromHeads(heads).values()) {
    if (slot.status !== "body" || slot.bodyKey > cutoff) continue;
    const neededThumb = thumbKeyFor(slot.bodyKey);
    if (thumbSide.open && (thumbSide.lastKey === "" || thumbSide.lastKey < neededThumb)) {
      return false;
    }
  }
  return true;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function prefixesOf(id: GroupId): { readonly body: string; readonly thumb: string } {
  const body = id.kind === "year" ? `${pad(id.year, 4)}-` : "u-";
  return { body, thumb: `t/${body}` };
}

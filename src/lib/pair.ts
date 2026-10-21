import { civilFromParts, type CivilCapture } from "./gallery.ts";
import { contentTypeForName, kindForName, mediaPath, type MediaKind } from "./media.ts";

declare const stemBrand: unique symbol;
declare const bodyKeyBrand: unique symbol;
declare const thumbKeyBrand: unique symbol;
declare const bodyUrlBrand: unique symbol;
declare const thumbUrlBrand: unique symbol;

const mediaSeal: unique symbol = Symbol("Media");

export type Stem = string & { readonly [stemBrand]: "Stem" };
export type BodyKey = string & { readonly [bodyKeyBrand]: "BodyKey" };
export type ThumbKey = string & { readonly [thumbKeyBrand]: "ThumbKey" };
export type BodyUrl = string & { readonly [bodyUrlBrand]: "BodyUrl" };
export type ThumbUrl = string & { readonly [thumbUrlBrand]: "ThumbUrl" };

export type Media = {
  readonly [mediaSeal]: "Media";
  readonly bodyKey: BodyKey;
  readonly kind: MediaKind;
  readonly bodyUrl: BodyUrl;
  readonly thumbUrl: ThumbUrl;
  readonly caption: string;
};

export type YearGroup =
  | { readonly label: string; readonly year: number; readonly items: readonly Media[] }
  | { readonly label: string; readonly year: null; readonly items: readonly Media[] };

export type MediaList = {
  readonly groups: readonly YearGroup[];
  readonly truncated: boolean;
};

export type BucketHead = {
  readonly key: string;
  readonly size: number;
  readonly uploaded: string;
};

export type UploadPlan = {
  readonly bodyKey: BodyKey;
  readonly thumbKey: ThumbKey;
  readonly kind: MediaKind;
  readonly bodyContentType: string;
};

export type PlannedFile = {
  readonly name: string;
  readonly filePath: string;
  readonly plan: UploadPlan;
};

export type ThumbnailFile = {
  readonly bytes: Uint8Array;
  readonly contentType: "image/webp";
};

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

type Classified =
  | { readonly stem: Stem; readonly role: "body"; readonly bodyKey: BodyKey }
  | { readonly stem: Stem; readonly role: "thumb"; readonly thumbKey: ThumbKey };

const DATED_STEM = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-([1-9]\d*))?$/;
const UNKNOWN_STEM = /^u-([0-9a-f]{12})(?:-([1-9]\d*))?$/;

function suffixOk(raw: string | undefined): boolean {
  if (raw === undefined) return true;
  return Number(raw) >= 2;
}

function isStem(value: string): value is Stem {
  const dated = DATED_STEM.exec(value);
  if (dated) {
    if (!suffixOk(dated[7])) return false;
    return (
      civilFromParts(
        Number(dated[1]),
        Number(dated[2]),
        Number(dated[3]),
        Number(dated[4]),
        Number(dated[5]),
        Number(dated[6]),
      ) !== null
    );
  }
  const unknown = UNKNOWN_STEM.exec(value);
  if (!unknown || !suffixOk(unknown[2])) return false;
  return true;
}

function isBodyKey(value: string): value is BodyKey {
  if (value.length === 0 || value.includes("/")) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;
  if (kindForName(value) === null) return false;
  return isStem(value.slice(0, dot));
}

function isThumbKey(value: string): value is ThumbKey {
  if (!value.startsWith("t/") || !value.endsWith(".webp")) return false;
  const stem = value.slice(2, -".webp".length);
  if (stem.length === 0 || stem.includes("/")) return false;
  return isStem(stem);
}

function isBodyUrl(value: string): value is BodyUrl {
  return value.startsWith("/media/") && !value.slice("/media/".length).includes("/");
}

function isThumbUrl(value: string): value is ThumbUrl {
  const prefix = "/media/t/";
  if (!value.startsWith(prefix) || !value.endsWith(".webp")) return false;
  const stem = value.slice(prefix.length, -".webp".length);
  return stem.length > 0 && !stem.includes("/");
}

function formatCivil(capture: CivilCapture): string {
  const pad = (value: number, width: number) => String(value).padStart(width, "0");
  return `${pad(capture.year, 4)}-${pad(capture.month, 2)}-${pad(capture.day, 2)}T${pad(capture.hour, 2)}-${pad(capture.minute, 2)}-${pad(capture.second, 2)}`;
}

function thumbKeyFor(bodyKey: BodyKey): ThumbKey {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  const key = `t/${stem}.webp`;
  if (isThumbKey(key)) return key;
  throw new Error(`サムネイルキーを作れません: ${bodyKey}`);
}

function urlForBody(bodyKey: BodyKey): BodyUrl {
  const url = mediaPath(bodyKey);
  if (isBodyUrl(url)) return url;
  throw new Error(`本体 URL を作れません: ${bodyKey}`);
}

function urlForThumb(thumbKey: ThumbKey): ThumbUrl {
  const url = mediaPath(thumbKey);
  if (isThumbUrl(url)) return url;
  throw new Error(`サムネイル URL を作れません: ${thumbKey}`);
}

function kindOfBody(bodyKey: BodyKey): MediaKind {
  const kind = kindForName(bodyKey);
  if (kind === "image" || kind === "video") return kind;
  throw new Error(`種類がありません: ${bodyKey}`);
}

export class StemClaim {
  private readonly taken = new Set<string>();

  plan(capture: CivilCapture | null, extension: string, unknownId: string): UploadPlan {
    const ext = extension.toLowerCase();
    const base = capture ? formatCivil(capture) : `u-${unknownId}`;
    const stem = this.claim(base);
    const key = `${stem}.${ext}`;
    if (!isBodyKey(key)) throw new Error(`本体キーを作れません: ${key}`);
    return {
      bodyKey: key,
      thumbKey: thumbKeyFor(key),
      kind: kindOfBody(key),
      bodyContentType: contentTypeForName(key),
    };
  }

  private claim(base: string): Stem {
    let stem = base;
    if (this.taken.has(stem)) {
      let suffix = 2;
      while (this.taken.has(`${base}-${suffix}`)) suffix += 1;
      stem = `${base}-${suffix}`;
    }
    this.taken.add(stem);
    if (isStem(stem)) return stem;
    throw new Error(`ステムを作れません: ${stem}`);
  }
}

export function captureFromKey(bodyKey: BodyKey): CivilCapture | null {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  const dated = DATED_STEM.exec(stem);
  if (!dated) return null;
  return civilFromParts(
    Number(dated[1]),
    Number(dated[2]),
    Number(dated[3]),
    Number(dated[4]),
    Number(dated[5]),
    Number(dated[6]),
  );
}

function classify(key: string): Classified | null {
  if (isThumbKey(key)) {
    const stem = key.slice(2, -".webp".length);
    if (!isStem(stem)) return null;
    return { stem, role: "thumb", thumbKey: key };
  }
  if (isBodyKey(key)) {
    const stem = key.slice(0, key.lastIndexOf("."));
    if (!isStem(stem)) return null;
    return { stem, role: "body", bodyKey: key };
  }
  return null;
}

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

function groupRanked(ranked: readonly Ranked[]): YearGroup[] {
  const byYear = new Map<number, DatedRanked[]>();
  const unknown: Ranked[] = [];
  for (const item of ranked) {
    if (!isDated(item)) {
      unknown.push(item);
      continue;
    }
    const bucket = byYear.get(item.captured.year);
    if (bucket) bucket.push(item);
    else byYear.set(item.captured.year, [item]);
  }
  const groups: YearGroup[] = [...byYear.keys()]
    .sort((left, right) => right - left)
    .map((year) => ({
      label: String(year),
      year,
      items: (byYear.get(year) ?? []).sort(compareDated).map((item) => item.media),
    }));
  if (unknown.length > 0) {
    groups.push({
      label: "年不明",
      year: null,
      items: unknown.sort(compareUnknown).map((item) => item.media),
    });
  }
  return groups;
}

export function galleryFromHeads(heads: readonly BucketHead[], listTruncated: boolean): MediaList {
  const slots = new Map<Stem, Slot>();
  for (const head of heads) {
    const found = classify(head.key);
    if (!found) continue;
    const current = slots.get(found.stem) ?? { status: "empty" };
    const next =
      found.role === "body"
        ? seeBody(current, head, found.bodyKey)
        : seeThumb(current, found.thumbKey);
    slots.set(found.stem, next);
  }
  const ranked: Ranked[] = [];
  for (const slot of slots.values()) {
    if (slot.status === "pair") ranked.push(mediaFromPair(slot.head, slot.bodyKey));
  }
  return { groups: groupRanked(ranked), truncated: listTruncated };
}

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

declare const yearBrand: unique symbol;

/** A capture year in 1..9999. The label is `String(year)`; the key prefix pads it to 4 digits. */
export type Year = number & { readonly [yearBrand]: "Year" };

export type YearGroup = {
  readonly label: string;
  /** Some object under this heading's prefixes was not read because of the object budget. */
  readonly truncated: boolean;
  readonly items: readonly [Media, ...Media[]];
};

/**
 * One step of the walk. A null `group` means this step had no pairs, not the end.
 * `next` is the `after` for the following step; null ends the walk.
 */
export type ListingPage = {
  readonly group: YearGroup | null;
  readonly next: Year | null;
};

export type Lister = {
  list(options: Pick<R2ListOptions, "prefix" | "delimiter" | "cursor" | "limit">): Promise<
    {
      readonly objects: readonly Pick<R2Object, "key" | "size" | "uploaded">[];
      readonly delimitedPrefixes: readonly string[];
    } & ({ readonly truncated: true; readonly cursor: string } | { readonly truncated: false })
  >;
};

/** R2 `list` call count and wall time accumulated by {@link timedLister}. */
export type ListTimingStats = {
  readonly r2Calls: number;
  readonly r2DurationMs: number;
};

/**
 * Wraps a {@link Lister} so each `list` call is counted and timed.
 * Stats cover only the wrapped calls; the caller measures end-to-end separately.
 */
export function timedLister(bucket: Lister): {
  readonly bucket: Lister;
  readonly stats: () => ListTimingStats;
} {
  let r2Calls = 0;
  let r2DurationMs = 0;
  return {
    bucket: {
      async list(options) {
        r2Calls += 1;
        const started = performance.now();
        try {
          return await bucket.list(options);
        } finally {
          r2DurationMs += performance.now() - started;
        }
      },
    },
    stats: () => ({ r2Calls, r2DurationMs }),
  };
}

/**
 * Builds a `Server-Timing` value for the year-list API.
 * `r2` carries the list call count in `desc` and the summed list time in `dur`.
 * `total` is the handler wall time until the response is ready.
 */
export function serverTimingHeader(stats: ListTimingStats, totalDurationMs: number): string {
  const r2Dur = Math.max(0, stats.r2DurationMs).toFixed(1);
  const totalDur = Math.max(0, totalDurationMs).toFixed(1);
  return `r2;desc="${stats.r2Calls}";dur=${r2Dur}, total;dur=${totalDur}`;
}

type GroupId = { readonly kind: "year"; readonly year: Year } | { readonly kind: "unknown" };

type BucketHead = {
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
const UNKNOWN_LABEL = "年不明";

const LIST_PAGE_SIZE = 1000;
const GROUP_OBJECT_CAP = 20_000;
const DISCOVERY_PAGE_CAP = 20;
const PAST_YEAR_PREFIXES = ":";
/** Year-list cards show at most this many thumbnails (R-GAL-10). */
const PREVIEW_COUNT = 4;
/** Page size while gathering year-list previews; stop once {@link PREVIEW_COUNT} pairs are stable. */
const PREVIEW_PAGE_SIZE = 32;

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

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function formatCivil(capture: CivilCapture): string {
  return `${pad(capture.year, 4)}-${pad(capture.month, 2)}-${pad(capture.day, 2)}T${pad(capture.hour, 2)}-${pad(capture.minute, 2)}-${pad(capture.second, 2)}`;
}

export function thumbKeyFor(bodyKey: BodyKey): ThumbKey {
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

function slotsFromHeads(heads: readonly BucketHead[]): Map<Stem, Slot> {
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
  return slots;
}

function pairsFromHeads(heads: readonly BucketHead[]): Ranked[] {
  const ranked: Ranked[] = [];
  for (const slot of slotsFromHeads(heads).values()) {
    if (slot.status === "pair") ranked.push(mediaFromPair(slot.head, slot.bodyKey));
  }
  return ranked;
}

function groupFromHeads(
  id: GroupId,
  heads: readonly BucketHead[],
  truncated: boolean,
): YearGroup | null {
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

function toYear(value: number): Year | null {
  return Number.isInteger(value) && value >= 1 && value <= 9999 ? (value as Year) : null;
}

export function parseYear(raw: string): Year | null {
  return /^[1-9]\d{0,3}$/.test(raw) ? toYear(Number(raw)) : null;
}

export type YearQuery = Year | "unknown";

/** `unknown`, or a year in 1..9999 with no leading zeros. */
export function parseYearQuery(raw: string): YearQuery | null {
  if (raw === "unknown") return "unknown";
  return parseYear(raw);
}

export type YearListYear = {
  readonly label: string;
  readonly previews: readonly Media[];
};

function groupIdOf(query: YearQuery): GroupId {
  return query === "unknown" ? { kind: "unknown" } : { kind: "year", year: query };
}

function previewMediasFromHeads(id: GroupId, heads: readonly BucketHead[]): readonly Media[] {
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
function previewPairsStable(
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

async function previewMedias(bucket: Lister, id: GroupId): Promise<readonly Media[] | null> {
  const { body, thumb } = prefixesOf(id);
  const bodySide = {
    prefix: body,
    cursor: undefined as string | undefined,
    open: true,
    lastKey: "",
  };
  const thumbSide = {
    prefix: thumb,
    cursor: undefined as string | undefined,
    open: true,
    lastKey: "",
  };
  const heads: BucketHead[] = [];

  for (;;) {
    const open = [bodySide, thumbSide].filter((side) => side.open);
    if (open.length === 0) break;
    const pages = await Promise.all(
      open.map((side) =>
        bucket.list({ prefix: side.prefix, cursor: side.cursor, limit: PREVIEW_PAGE_SIZE }),
      ),
    );
    for (const [index, page] of pages.entries()) {
      const side = open[index]!;
      for (const object of page.objects) {
        heads.push({
          key: object.key,
          size: object.size,
          uploaded: object.uploaded.toISOString(),
        });
        side.lastKey = object.key;
      }
      if (!page.truncated) {
        side.open = false;
      } else if (page.objects.length === 0 || page.cursor === side.cursor) {
        side.open = false;
      } else {
        side.cursor = page.cursor;
      }
    }
    const previews = previewMediasFromHeads(id, heads);
    if (previewPairsStable(id, heads, previews, bodySide, thumbSide)) {
      return previews;
    }
  }

  const previews = previewMediasFromHeads(id, heads);
  return previews.length > 0 ? previews : null;
}

export async function readYearList(
  bucket: Lister,
): Promise<{ readonly years: readonly YearListYear[] }> {
  const discovered = [...(await discoverYears(bucket))].sort((left, right) => right - left);
  const [yearCards, unknown] = await Promise.all([
    Promise.all(
      discovered.map(async (year) => {
        const previews = await previewMedias(bucket, { kind: "year", year });
        if (previews === null || previews.length === 0) return null;
        return { label: String(year), previews } satisfies YearListYear;
      }),
    ),
    previewMedias(bucket, { kind: "unknown" }),
  ]);
  const years: YearListYear[] = [];
  for (const card of yearCards) {
    if (card !== null) years.push(card);
  }
  if (unknown !== null && unknown.length > 0) {
    years.push({ label: UNKNOWN_LABEL, previews: unknown });
  }
  return { years };
}

export async function readYearContents(
  bucket: Lister,
  query: YearQuery,
): Promise<YearGroup | null> {
  const id = groupIdOf(query);
  const { body, thumb } = prefixesOf(id);
  if (id.kind === "unknown") {
    const probe = await bucket.list({ prefix: body, limit: 1 });
    if (probe.objects.length === 0) return null;
  }
  const read = await readGroup(bucket, [body, thumb]);
  return groupFromHeads(id, read.heads, read.truncated);
}

function yearFromDelimitedPrefix(prefix: string): Year | null {
  const match = /^(\d{4})-$/.exec(prefix);
  return match ? toYear(Number(match[1])) : null;
}

function prefixesOf(id: GroupId): { readonly body: string; readonly thumb: string } {
  const body = id.kind === "year" ? `${pad(id.year, 4)}-` : "u-";
  return { body, thumb: `t/${body}` };
}

function groupAfter(years: readonly Year[], after: Year | null): GroupId {
  let best: Year | null = null;
  for (const year of years) {
    if ((after === null || year < after) && (best === null || year > best)) best = year;
  }
  return best === null ? { kind: "unknown" } : { kind: "year", year: best };
}

async function discoverYears(bucket: Lister): Promise<readonly Year[]> {
  const years: Year[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < DISCOVERY_PAGE_CAP; page++) {
    const listed = await bucket.list({ delimiter: "-", cursor, limit: LIST_PAGE_SIZE });
    for (const prefix of listed.delimitedPrefixes) {
      const year = yearFromDelimitedPrefix(prefix);
      if (year !== null) years.push(year);
    }
    if (!listed.truncated) return years;
    const lastPrefix = listed.delimitedPrefixes.at(-1) ?? "";
    const lastKey = listed.objects.at(-1)?.key ?? "";
    if (lastPrefix >= PAST_YEAR_PREFIXES || lastKey >= PAST_YEAR_PREFIXES) return years;
    cursor = listed.cursor;
  }
  // The unread pages would hold the newest years, so a partial answer would reorder the gallery.
  throw new Error("年を探す一覧が上限を超えました。");
}

function shareRoom(room: number, sides: number): number[] {
  const limits: number[] = [];
  for (let left = room; limits.length < sides && left > 0;) {
    const limit = Math.min(LIST_PAGE_SIZE, Math.ceil(left / (sides - limits.length)));
    limits.push(limit);
    left -= limit;
  }
  return limits;
}

async function readGroup(
  bucket: Lister,
  prefixes: readonly string[],
): Promise<{ readonly heads: readonly BucketHead[]; readonly truncated: boolean }> {
  const sides = prefixes.map((prefix) => ({
    prefix,
    cursor: undefined as string | undefined,
    open: true,
  }));
  const heads: BucketHead[] = [];
  let truncated = false;
  for (;;) {
    const open = sides.filter((side) => side.open);
    if (open.length === 0) return { heads, truncated };
    const limits = shareRoom(GROUP_OBJECT_CAP - heads.length, open.length);
    if (limits.length === 0) return { heads, truncated: true };
    const pages = await Promise.all(
      limits.map((limit, index) =>
        bucket.list({ prefix: open[index].prefix, cursor: open[index].cursor, limit }),
      ),
    );
    for (const [index, page] of pages.entries()) {
      const side = open[index];
      for (const object of page.objects) {
        heads.push({ key: object.key, size: object.size, uploaded: object.uploaded.toISOString() });
      }
      if (!page.truncated) {
        side.open = false;
      } else if (page.objects.length === 0 || page.cursor === side.cursor) {
        side.open = false;
        truncated = true;
      } else {
        side.cursor = page.cursor;
      }
    }
  }
}

export async function readPage(bucket: Lister, after: Year | null): Promise<ListingPage> {
  const id = groupAfter(await discoverYears(bucket), after);
  const next = id.kind === "year" ? id.year : null;
  const { body, thumb } = prefixesOf(id);
  if (id.kind === "unknown") {
    const probe = await bucket.list({ prefix: body, limit: 1 });
    if (probe.objects.length === 0) return { group: null, next };
  }
  const read = await readGroup(bucket, [body, thumb]);
  return { group: groupFromHeads(id, read.heads, read.truncated), next };
}

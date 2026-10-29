import { groupFromHeads, prefixesOf, type BucketHead, type GroupId } from "./group.ts";
import type { Lister, ListingPage, Year } from "./types.ts";
import { toYear } from "./year.ts";

const LIST_PAGE_SIZE = 1000;
const GROUP_OBJECT_CAP = 20_000;
const DISCOVERY_PAGE_CAP = 20;
const PAST_YEAR_PREFIXES = ":";

function yearFromDelimitedPrefix(prefix: string): Year | null {
  const match = /^(\d{4})-$/.exec(prefix);
  return match ? toYear(Number(match[1])) : null;
}

function groupAfter(years: readonly Year[], after: Year | null): GroupId {
  let best: Year | null = null;
  for (const year of years) {
    if ((after === null || year < after) && (best === null || year > best)) best = year;
  }
  return best === null ? { kind: "unknown" } : { kind: "year", year: best };
}

export async function discoverYears(bucket: Lister): Promise<readonly Year[]> {
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

export async function readGroup(
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
        heads.push({
          key: object.key,
          size: object.size,
          uploaded: object.uploaded.toISOString(),
        });
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

import {
  groupFromHeads,
  prefixesOf,
  previewMediasFromHeads,
  previewPairsStable,
  UNKNOWN_LABEL,
  type BucketHead,
  type GroupId,
} from "./pair-group.ts";
import { discoverYears, readGroup } from "./pair-page.ts";
import type { Lister, Media, YearGroup } from "./pair-types.ts";
import type { YearQuery } from "./pair-year.ts";

export type YearListYear = {
  readonly label: string;
  readonly previews: readonly Media[];
};

/** Page size while gathering year-list previews; stop once the first 4 pairs are stable. */
const PREVIEW_PAGE_SIZE = 32;

function groupIdOf(query: YearQuery): GroupId {
  return query === "unknown" ? { kind: "unknown" } : { kind: "year", year: query };
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

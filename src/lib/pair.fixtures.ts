import { readPage, type Lister, type ListingPage, type Year, type YearGroup } from "./pair.ts";
import { parseYear } from "./pair.ts";

export const noon = {
  year: 2024,
  month: 8,
  day: 2,
  hour: 12,
  minute: 0,
  second: 0,
};

type Listing = Parameters<Lister["list"]>[0];
type Stored = { readonly key: string; readonly size: number; readonly uploaded: Date };

export function stored(key: string, uploaded: string, size = 10): Stored {
  return { key, size, uploaded: new Date(uploaded) };
}

export function pairOf(bodyKey: string, uploaded: string): Stored[] {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  return [stored(bodyKey, uploaded), stored(`t/${stem}.webp`, uploaded, 4)];
}

export function memoryBucket(objects: readonly Stored[]) {
  const sorted = [...objects].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const calls: { readonly options: Listing; readonly objects: number }[] = [];
  const bucket: Lister = {
    async list(options) {
      const prefix = options.prefix ?? "";
      const limit = options.limit ?? 1000;
      const delimiter = options.delimiter;
      const matching = sorted.filter((object) => object.key.startsWith(prefix));
      const found: Stored[] = [];
      const delimitedPrefixes: string[] = [];
      let index = options.cursor === undefined ? 0 : Number(options.cursor);
      while (index < matching.length && found.length + delimitedPrefixes.length < limit) {
        const key = matching[index].key;
        const cut = delimiter === undefined ? -1 : key.indexOf(delimiter, prefix.length);
        if (delimiter === undefined || cut === -1) {
          found.push(matching[index]);
          index += 1;
          continue;
        }
        const group = key.slice(0, cut + delimiter.length);
        delimitedPrefixes.push(group);
        while (index < matching.length && matching[index].key.startsWith(group)) index += 1;
      }
      calls.push({ options, objects: found.length });
      return index < matching.length
        ? { objects: found, delimitedPrefixes, truncated: true, cursor: String(index) }
        : { objects: found, delimitedPrefixes, truncated: false };
    },
  };
  return {
    bucket,
    prefixesListed: () =>
      new Set(
        calls.filter((call) => call.options.delimiter === undefined).map((c) => c.options.prefix),
      ),
    objectsRead: (prefix: string) =>
      calls
        .filter((call) => call.options.prefix === prefix)
        .reduce((sum, call) => sum + call.objects, 0),
    discoveryCalls: () => calls.filter((call) => call.options.delimiter !== undefined).length,
  };
}

export function year(value: number): Year {
  const parsed = parseYear(String(value));
  if (parsed === null) throw new Error(`not a year: ${value}`);
  return parsed;
}

export async function walk(bucket: Lister): Promise<ListingPage[]> {
  const pages: ListingPage[] = [];
  let after: Year | null = null;
  for (;;) {
    const page = await readPage(bucket, after);
    pages.push(page);
    if (page.next === null) return pages;
    after = page.next;
  }
}

export async function groupsOf(objects: readonly Stored[]): Promise<YearGroup[]> {
  const pages = await walk(memoryBucket(objects).bucket);
  return pages.flatMap((page) => (page.group ? [page.group] : []));
}

export function bodyKeys(groups: readonly YearGroup[]): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.bodyKey));
}

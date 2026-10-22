import { describe, expect, it } from "vite-plus/test";
import {
  captureFromKey,
  parseYear,
  readPage,
  StemClaim,
  type Lister,
  type ListingPage,
  type ThumbnailFile,
  type Year,
  type YearGroup,
} from "./pair.ts";

const noon = {
  year: 2024,
  month: 8,
  day: 2,
  hour: 12,
  minute: 0,
  second: 0,
};

type Listing = Parameters<Lister["list"]>[0];
type Stored = { readonly key: string; readonly size: number; readonly uploaded: Date };

function stored(key: string, uploaded: string, size = 10): Stored {
  return { key, size, uploaded: new Date(uploaded) };
}

function pairOf(bodyKey: string, uploaded: string): Stored[] {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  return [stored(bodyKey, uploaded), stored(`t/${stem}.webp`, uploaded, 4)];
}

function memoryBucket(objects: readonly Stored[]) {
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

function year(value: number): Year {
  const parsed = parseYear(String(value));
  if (parsed === null) throw new Error(`not a year: ${value}`);
  return parsed;
}

async function walk(bucket: Lister): Promise<ListingPage[]> {
  const pages: ListingPage[] = [];
  let after: Year | null = null;
  for (;;) {
    const page = await readPage(bucket, after);
    pages.push(page);
    if (page.next === null) return pages;
    after = page.next;
  }
}

async function groupsOf(objects: readonly Stored[]): Promise<YearGroup[]> {
  const pages = await walk(memoryBucket(objects).bucket);
  return pages.flatMap((page) => (page.group ? [page.group] : []));
}

function bodyKeys(groups: readonly YearGroup[]): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.bodyKey));
}

describe("StemClaim.plan", () => {
  it("同じ秒は拡張子が違っても別のステムになり、サムネイルは WebP", () => {
    const stems = new StemClaim();
    const jpg = stems.plan(noon, "JPG", "");
    const png = stems.plan(noon, "png", "");
    const gif = stems.plan(noon, "gif", "");
    expect(jpg.bodyKey).toBe("2024-08-02T12-00-00.jpg");
    expect(png.bodyKey).toBe("2024-08-02T12-00-00-2.png");
    expect(gif.bodyKey).toBe("2024-08-02T12-00-00-3.gif");
    expect(jpg.thumbKey).toBe("t/2024-08-02T12-00-00.webp");
    expect(png.thumbKey).toBe("t/2024-08-02T12-00-00-2.webp");
    expect(jpg.thumbKey.endsWith(".webp")).toBe(true);
    expect(jpg.kind).toBe("image");
    expect(jpg.bodyContentType).toBe("image/jpeg");
    const contentType = "image/webp" satisfies ThumbnailFile["contentType"];
    expect(contentType).toBe("image/webp");
  });

  it("日付が無いときは内容の識別子を使い、同じ識別子は -2 になる", () => {
    const stems = new StemClaim();
    const first = stems.plan(null, "png", "abc123def456");
    const second = stems.plan(null, "jpg", "abc123def456");
    expect(first.bodyKey).toBe("u-abc123def456.png");
    expect(first.thumbKey).toBe("t/u-abc123def456.webp");
    expect(second.bodyKey).toBe("u-abc123def456-2.jpg");
    expect(captureFromKey(first.bodyKey)).toBeNull();
  });

  it("別の秒は接尾辞を付けない", () => {
    const stems = new StemClaim();
    stems.plan(noon, "jpg", "");
    const later = stems.plan({ ...noon, second: 1 }, "jpg", "");
    expect(later.bodyKey).toBe("2024-08-02T12-00-01.jpg");
    expect(captureFromKey(later.bodyKey)).toEqual({ ...noon, second: 1 });
  });

  it("撮影日時のキーは接尾辞があっても同じ暦を返す", () => {
    const stems = new StemClaim();
    const first = stems.plan(noon, "jpg", "");
    const second = stems.plan(noon, "mov", "");
    expect(captureFromKey(first.bodyKey)).toEqual(noon);
    expect(captureFromKey(second.bodyKey)).toEqual(noon);
    expect(second.kind).toBe("video");
  });

  it("暦として読めない撮影日時や短い識別子ではキーを作らない", () => {
    const stems = new StemClaim();
    expect(() =>
      stems.plan({ year: 2024, month: 13, day: 1, hour: 0, minute: 0, second: 0 }, "jpg", ""),
    ).toThrow();
    expect(() => stems.plan(null, "png", "abc")).toThrow();
  });
});

describe("parseYear", () => {
  it("1 から 9999 の先頭 0 の無い数字だけを年にする", () => {
    expect(parseYear("2024")).toBe(2024);
    expect(parseYear("7")).toBe(7);
    expect(parseYear("9999")).toBe(9999);
    for (const raw of ["", "0", "007", "10000", "-1", "20.5", "abc", " 2024"]) {
      expect(parseYear(raw)).toBeNull();
    }
  });
});

describe("readPage", () => {
  it("新しい年から 1 年ずつ返し、組の無い年は見出しを返さずに続きを返す", async () => {
    const pages = await walk(
      memoryBucket([
        ...pairOf("u-abc123def456.png", "2026-10-18T09:00:00.000Z"),
        ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
        ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
        stored("folder/nested.jpg", "2026-10-18T08:00:00.000Z"),
        stored("2022-01-01T00-00-00.jpg", "2026-10-18T08:00:00.000Z"),
        stored("t/2020-01-01T00-00-00.webp", "2026-10-18T08:00:00.000Z"),
        stored("t/2019-01-01T00-00-00.webp", "2026-10-18T08:00:00.000Z"),
        stored("t/2024-08-02T12-00-00.WEBP", "2026-10-18T08:00:00.000Z"),
      ]).bucket,
    );
    expect(pages.map((page) => [page.group?.label ?? null, page.next])).toEqual([
      ["2024", 2024],
      [null, 2022],
      ["2020", 2020],
      ["年不明", null],
    ]);
    const groups = pages.flatMap((page) => (page.group ? [page.group] : []));
    expect(groups.every((group) => !group.truncated)).toBe(true);
    expect(bodyKeys(groups)).toEqual([
      "2024-08-02T12-00-00.jpg",
      "2020-01-01T00-00-01.jpg",
      "u-abc123def456.png",
    ]);
  });

  it("最初の呼び出しは一番新しい年の本体とサムネイルだけを読む", async () => {
    const bucket = memoryBucket([
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
      ...pairOf("2023-05-01T08-30-00.mp4", "2026-01-01T00:00:00.000Z"),
      ...pairOf("u-abc123def456.png", "2026-01-01T00:00:00.000Z"),
    ]);
    const first = await readPage(bucket.bucket, null);
    expect(first.group?.label).toBe("2024");
    expect(first.next).toBe(2024);
    expect(bucket.prefixesListed()).toEqual(new Set(["2024-", "t/2024-"]));
  });

  it("サムネイルが thumbKey の形でないと組にしない", async () => {
    const uploaded = "2026-10-18T01:00:00.000Z";
    expect(
      await groupsOf([
        stored("2024-08-02T12-00-00.jpg", uploaded),
        stored("t/2024-08-02T12-00-00.jpg", uploaded),
        stored("thumbs/2024-08-02T12-00-00.webp", uploaded),
      ]),
    ).toEqual([]);
  });

  it("同じステムの本体が二つあるとサムネイルがあっても出さない", async () => {
    const uploaded = "2026-10-18T01:00:00.000Z";
    expect(
      await groupsOf([
        stored("2024-08-02T12-00-00.jpg", uploaded),
        stored("2024-08-02T12-00-00.png", uploaded),
        stored("t/2024-08-02T12-00-00.webp", uploaded),
      ]),
    ).toEqual([]);
  });

  it("フィールドは組の公開分だけ", async () => {
    const [group] = await groupsOf(pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"));
    expect(group?.items).toHaveLength(1);
    const item = group?.items[0];
    expect(item?.bodyKey).toBe("2024-08-02T12-00-00.jpg");
    expect(item?.kind).toBe("image");
    expect(item?.bodyUrl).toBe("/media/2024-08-02T12-00-00.jpg");
    expect(item?.thumbUrl).toBe("/media/t/2024-08-02T12-00-00.webp");
    expect(item?.caption).toBe("2024-08-02T12-00-00.jpg");
    expect(Object.keys(item ?? {}).sort()).toEqual([
      "bodyKey",
      "bodyUrl",
      "caption",
      "kind",
      "thumbUrl",
    ]);
  });

  it("年内は暦の降順、同じ秒は uploaded の次に bodyKey", async () => {
    const [group] = await groupsOf([
      ...pairOf("2024-08-02T12-00-00-3.jpg", "2026-01-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00-2.jpg", "2026-01-02T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
      ...pairOf("2024-01-02T08-00-00.jpg", "2026-06-01T00:00:00.000Z"),
      ...pairOf("2024-12-02T08-00-00.jpg", "2026-01-01T00:00:00.000Z"),
    ]);
    expect(group?.items.map((item) => item.bodyKey)).toEqual([
      "2024-12-02T08-00-00.jpg",
      "2024-08-02T12-00-00-2.jpg",
      "2024-08-02T12-00-00.jpg",
      "2024-08-02T12-00-00-3.jpg",
      "2024-01-02T08-00-00.jpg",
    ]);
  });

  it("年不明の本体が無ければ年不明は付かず、t/u- は読まない", async () => {
    const bucket = memoryBucket([
      ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
      stored("t/u-aaaaaaaaaaaa.webp", "2026-10-18T01:00:00.000Z"),
    ]);
    const pages = await walk(bucket.bucket);
    expect(pages.map((page) => page.group?.label ?? null)).toEqual(["2024", "2020", null]);
    expect(pages.at(-1)?.next).toBeNull();
    expect(bucket.prefixesListed().has("t/u-")).toBe(false);
    expect(bucket.prefixesListed().has("u-")).toBe(true);
  });

  it("動画と画像を種類と URL 付きで返し、年不明は uploaded の次に bodyKey", async () => {
    const groups = await groupsOf([
      ...pairOf("u-bbbbbbbbbbbb.mp4", "2026-10-17T09:00:00.000Z"),
      ...pairOf("2020-01-01T00-00-01.jpg", "2026-10-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-10-18T01:00:00.000Z"),
      ...pairOf("2024-08-02T15-00-00.mov", "2026-10-18T02:00:00.000Z"),
      ...pairOf("u-aaaaaaaaaaaa.png", "2026-10-18T09:00:00.000Z"),
      ...pairOf("u-cccccccccccc.png", "2026-10-18T09:00:00.000Z"),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["2024", "2020", "年不明"]);
    expect(groups[0]?.items.map((item) => item.bodyKey)).toEqual([
      "2024-08-02T15-00-00.mov",
      "2024-08-02T12-00-00.jpg",
    ]);
    expect(groups[0]?.items[0]?.bodyUrl).toBe("/media/2024-08-02T15-00-00.mov");
    expect(groups[0]?.items[0]?.thumbUrl).toBe("/media/t/2024-08-02T15-00-00.webp");
    expect(groups[0]?.items[0]?.kind).toBe("video");
    expect(groups[0]?.items[1]?.kind).toBe("image");
    expect(groups[2]?.items.map((item) => item.bodyKey)).toEqual([
      "u-aaaaaaaaaaaa.png",
      "u-cccccccccccc.png",
      "u-bbbbbbbbbbbb.mp4",
    ]);
  });

  it("存在しない日や -1 の接尾辞は組にしない", async () => {
    const groups = await groupsOf([
      ...pairOf("2023-02-29T00-00-00.jpg", "2026-01-01T00:00:00.000Z"),
      ...pairOf("2024-08-02T12-00-00-1.jpg", "2026-01-01T00:00:00.000Z"),
      ...pairOf("2024-02-29T00-00-00.jpg", "2026-01-01T00:00:00.000Z"),
    ]);
    expect(bodyKeys(groups)).toEqual(["2024-02-29T00-00-00.jpg"]);
  });

  it("4 桁に満たない年は 0 で埋めた名前を読み、見出しは数字のまま", async () => {
    const bucket = memoryBucket(pairOf("0007-01-01T00-00-00.jpg", "2026-01-01T00:00:00.000Z"));
    const first = await readPage(bucket.bucket, null);
    expect(first.group?.label).toBe("7");
    expect(first.next).toBe(7);
    expect(bucket.prefixesListed()).toEqual(new Set(["0007-", "t/0007-"]));
  });

  it("1 年は本体とサムネイルを合わせて 20,000 オブジェクトまで読み、超えたら truncated", async () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        pairOf(`2023-01-01T00-00-00-${i + 2}.jpg`, "2026-01-01T00:00:00.000Z"),
      ).flat();
    const over = memoryBucket([
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-02T00:00:00.000Z"),
      ...many(12_000),
    ]);
    const capped = await readPage(over.bucket, year(2024));
    expect(capped.group?.label).toBe("2023");
    expect(capped.group?.truncated).toBe(true);
    expect(capped.group?.items).toHaveLength(10_000);
    expect(over.objectsRead("2023-") + over.objectsRead("t/2023-")).toBe(20_000);

    const exact = await readPage(memoryBucket(many(10_000)).bucket, null);
    expect(exact.group?.truncated).toBe(false);
    expect(exact.group?.items).toHaveLength(10_000);
  });

  it("続きが進まないか空なら、その年を truncated にして止める", async () => {
    const inner = memoryBucket(pairOf("2024-08-02T12-00-00.jpg", "2026-01-01T00:00:00.000Z"));
    for (const rest of ["repeat", "empty"] as const) {
      const endless: Lister = {
        async list(options) {
          if (options.prefix !== "t/2024-") return inner.bucket.list(options);
          const listed = await inner.bucket.list({ ...options, cursor: undefined });
          const empty = rest === "empty" && options.cursor !== undefined;
          return {
            objects: empty ? [] : listed.objects,
            delimitedPrefixes: [],
            truncated: true,
            cursor: rest === "repeat" ? "again" : `${options.cursor ?? ""}+`,
          };
        },
      };
      const page = await readPage(endless, null);
      expect(page.group?.truncated).toBe(true);
      expect(page.group?.items.map((item) => item.bodyKey)).toEqual(["2024-08-02T12-00-00.jpg"]);
    }
  });

  it("名前が数字で始まらないものは、年を探す一覧のページを増やさない", async () => {
    const bucket = memoryBucket([
      ...pairOf("2024-08-02T12-00-00.jpg", "2026-01-01T00:00:00.000Z"),
      ...Array.from({ length: 1500 }, (_, i) =>
        stored(`IMG_${String(i).padStart(4, "0")}.JPG`, "2026-01-01T00:00:00.000Z"),
      ),
    ]);
    await readPage(bucket.bucket, null);
    expect(bucket.discoveryCalls()).toBe(1);
  });

  it("年を探す一覧が 20 ページを超えると失敗する", async () => {
    const digits = (count: number) =>
      Array.from({ length: count }, (_, i) => stored(String(i), "2026-01-01T00:00:00.000Z"));
    await expect(readPage(memoryBucket(digits(20_000)).bucket, null)).resolves.toEqual({
      group: null,
      next: null,
    });
    await expect(readPage(memoryBucket(digits(20_001)).bucket, null)).rejects.toThrow();
  });
});

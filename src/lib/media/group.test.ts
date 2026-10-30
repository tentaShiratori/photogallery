import { describe, expect, it } from "vite-plus/test";
import { year } from "./media.fixtures.ts";
import {
  groupFromHeads,
  prefixesOf,
  previewMediasFromHeads,
  previewPairsStable,
  type BucketHead,
  type GroupId,
} from "./group.ts";

const uploaded = "2026-10-18T00:00:00.000Z";

function head(key: string, uploadedAt = uploaded, size = 10): BucketHead {
  return { key, size, uploaded: uploadedAt };
}

function pair(bodyKey: string, uploadedAt = uploaded): BucketHead[] {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  return [head(bodyKey, uploadedAt), head(`t/${stem}.webp`, uploadedAt, 4)];
}

const year2024: GroupId = { kind: "year", year: year(2024) };
const unknown: GroupId = { kind: "unknown" };

describe("groupFromHeads", () => {
  it("年の組は新しい暦が先で、同じ暦はアップロードが新しい方が先", () => {
    const group = groupFromHeads(
      year2024,
      [
        ...pair("2024-01-01T00-00-00.jpg", "2026-01-01T00:00:00.000Z"),
        ...pair("2024-06-01T00-00-00.jpg", "2026-02-01T00:00:00.000Z"),
        ...pair("2024-06-01T00-00-00-2.jpg", "2026-12-01T00:00:00.000Z"),
        ...pair("2020-01-01T00-00-00.jpg"),
        ...pair("u-abc123def456.png"),
      ],
      true,
    );
    expect(group?.label).toBe("2024");
    expect(group?.truncated).toBe(true);
    expect(group?.items.map((item) => item.bodyKey)).toEqual([
      "2024-06-01T00-00-00-2.jpg",
      "2024-06-01T00-00-00.jpg",
      "2024-01-01T00-00-00.jpg",
    ]);
    expect(group?.items[0]).toMatchObject({
      kind: "image",
      bodyUrl: "/media/2024-06-01T00-00-00-2.jpg",
      thumbUrl: "/media/t/2024-06-01T00-00-00-2.webp",
      caption: "2024-06-01T00-00-00-2.jpg",
    });
  });

  it("同じアップロード時刻は bodyKey の昇順", () => {
    const group = groupFromHeads(
      year2024,
      [...pair("2024-08-02T12-00-00-2.jpg"), ...pair("2024-08-02T12-00-00.jpg")],
      false,
    );
    expect(group?.items.map((item) => item.bodyKey)).toEqual(["2024-08-02T12-00-00-2.jpg", "2024-08-02T12-00-00.jpg"]);
  });

  it("年不明は日付の無い組だけを、アップロードの新しい順に返す", () => {
    const group = groupFromHeads(
      unknown,
      [
        ...pair("u-bbbbbbbbbbbb.png", "2026-01-01T00:00:00.000Z"),
        ...pair("u-aaaaaaaaaaaa.png", "2026-06-01T00:00:00.000Z"),
        ...pair("2024-08-02T12-00-00.jpg"),
      ],
      false,
    );
    expect(group?.label).toBe("年不明");
    expect(group?.items.map((item) => item.bodyKey)).toEqual(["u-aaaaaaaaaaaa.png", "u-bbbbbbbbbbbb.png"]);
  });

  it("組が無ければ null。本体が二つ、またはサムネイルだけでも null", () => {
    expect(groupFromHeads(year2024, [], false)).toBeNull();
    expect(groupFromHeads(year2024, pair("2020-01-01T00-00-00.jpg"), false)).toBeNull();
    const stem = "2024-08-02T12-00-00";
    expect(
      groupFromHeads(year2024, [head(`${stem}.jpg`), head(`${stem}.png`), head(`t/${stem}.webp`)], false),
    ).toBeNull();
    expect(groupFromHeads(year2024, [head(`t/${stem}.webp`)], false)).toBeNull();
    expect(groupFromHeads(year2024, [head(`${stem}.jpg`)], false)).toBeNull();
  });
});

describe("previewMediasFromHeads", () => {
  it("bodyKey の昇順で最大 4 件。年不明は日付の無い組だけ", () => {
    const keys = [1, 2, 3, 4, 5].map((day) => `2024-01-0${day}T00-00-00.jpg`);
    const previews = previewMediasFromHeads(
      year2024,
      keys.flatMap((key) => pair(key)),
    );
    expect(previews.map((item) => item.bodyKey)).toEqual(keys.slice(0, 4));
    expect(previewMediasFromHeads(unknown, pair("u-abc123def456.png")).map((item) => item.bodyKey)).toEqual([
      "u-abc123def456.png",
    ]);
    expect(previewMediasFromHeads(year2024, pair("u-abc123def456.png"))).toEqual([]);
  });
});

describe("previewPairsStable", () => {
  const keys = [2, 3, 4, 5].map((day) => `2024-01-0${day}T00-00-00.jpg`);
  const heads = keys.flatMap((key) => pair(key));
  const previews = previewMediasFromHeads(year2024, heads);
  const cutoff = previews[3]!.bodyKey;
  const closed = { open: false, lastKey: "z" };

  it("4 件未満は不安定。一覧が cutoff を超えていれば安定", () => {
    expect(previews).toHaveLength(4);
    expect(previewPairsStable(year2024, heads, previews.slice(0, 3), closed, closed)).toBe(false);
    expect(previewPairsStable(year2024, heads, previews, closed, closed)).toBe(true);
    expect(
      previewPairsStable(year2024, heads, previews, { open: true, lastKey: "2024-01-01T00-00-00.jpg" }, closed),
    ).toBe(false);
    expect(previewPairsStable(year2024, heads, previews, { open: true, lastKey: cutoff }, closed)).toBe(true);
  });

  it("cutoff 以前の本体だけは、サムネイル側がまだ届くあいだ不安定", () => {
    const orphan = "2024-01-01T00-00-00.jpg";
    const withOrphan = [head(orphan), ...heads];
    const thumb = "t/2024-01-01T00-00-00.webp";
    expect(previewPairsStable(year2024, withOrphan, previews, closed, { open: true, lastKey: "" })).toBe(false);
    expect(previewPairsStable(year2024, withOrphan, previews, closed, { open: true, lastKey: "t/2023" })).toBe(false);
    expect(previewPairsStable(year2024, withOrphan, previews, closed, { open: true, lastKey: thumb })).toBe(true);
    expect(previewPairsStable(year2024, withOrphan, previews, closed, { open: false, lastKey: "" })).toBe(true);
    const laterOnly = [head("2024-01-06T00-00-00.jpg"), ...heads];
    expect(previewPairsStable(year2024, laterOnly, previews, closed, { open: true, lastKey: "" })).toBe(true);
  });
});

describe("prefixesOf", () => {
  it("年は 4 桁、年不明は u-", () => {
    expect(prefixesOf({ kind: "year", year: year(7) })).toEqual({ body: "0007-", thumb: "t/0007-" });
    expect(prefixesOf(unknown)).toEqual({ body: "u-", thumb: "t/u-" });
  });
});

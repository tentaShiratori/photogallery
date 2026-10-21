import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useState, useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";
import type { MediaKind } from "../../lib/media";
import type { BodyUrl, ThumbUrl } from "../../lib/pair";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";

const statusClass = css`
  color: var(--muted);
`;

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const headingClass = css`
  margin: 18px 0 10px;
  font-size: 1.05rem;
  font-weight: 600;
`;

type ParsedMedia = {
  readonly bodyKey: string;
  readonly kind: MediaKind;
  readonly bodyUrl: BodyUrl;
  readonly thumbUrl: ThumbUrl;
  readonly caption: string;
};

type ParsedGroup = {
  readonly label: string;
  readonly year: number | null;
  readonly items: readonly ParsedMedia[];
};

type ParsedList = {
  readonly groups: readonly ParsedGroup[];
  readonly truncated: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBodyUrl(value: unknown): value is BodyUrl {
  return typeof value === "string" && value.length > 0;
}

function isThumbUrl(value: unknown): value is ThumbUrl {
  return typeof value === "string" && value.length > 0;
}

function parseItem(value: unknown): ParsedMedia | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  if (kind !== "image" && kind !== "video") return null;
  if (typeof value.bodyKey !== "string" || value.bodyKey.length === 0) return null;
  if (typeof value.caption !== "string" || value.caption.length === 0) return null;
  if (!isBodyUrl(value.bodyUrl) || !isThumbUrl(value.thumbUrl)) return null;
  return {
    bodyKey: value.bodyKey,
    kind,
    bodyUrl: value.bodyUrl,
    thumbUrl: value.thumbUrl,
    caption: value.caption,
  };
}

function parseMediaList(input: unknown): ParsedList {
  if (!isRecord(input) || typeof input.truncated !== "boolean" || !Array.isArray(input.groups)) {
    throw new Error("一覧の形が違います。");
  }
  const groups: ParsedGroup[] = [];
  for (const group of input.groups) {
    if (!isRecord(group) || typeof group.label !== "string" || !Array.isArray(group.items)) {
      throw new Error("一覧の形が違います。");
    }
    if (group.year !== null && typeof group.year !== "number") {
      throw new Error("一覧の形が違います。");
    }
    const items: ParsedMedia[] = [];
    for (const item of group.items) {
      const parsed = parseItem(item);
      if (!parsed) throw new Error("一覧の形が違います。");
      items.push(parsed);
    }
    groups.push({ label: group.label, year: group.year, items });
  }
  return { truncated: input.truncated, groups };
}

const Gallery: FC = () => {
  const [groups, setGroups] = useState<readonly ParsedGroup[]>([]);
  const [status, setStatus] = useState("読み込み中です。");
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/media");
      if (!response.ok) {
        setStatus("一覧を取得できませんでした。");
        return;
      }
      let data: ParsedList;
      try {
        data = parseMediaList(await response.json());
      } catch {
        setStatus("一覧を取得できませんでした。");
        return;
      }
      const count = data.groups.reduce((sum, group) => sum + group.items.length, 0);
      setGroups(data.groups);
      if (count === 0 && data.truncated) {
        setStatus("一覧が上限で止まりました。");
      } else if (count === 0) {
        setStatus("まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。");
      } else {
        setStatus(`${count} 件${data.truncated ? "（上限で打ち切っています）" : ""}`);
      }
    })();
  }, []);

  return (
    <>
      <p class={statusClass} id="status">
        {status}
      </p>
      <div id="grid">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 class={headingClass}>{group.label}</h2>
            <div class={gridClass}>
              {group.items.map((item) => (
                <MediaTile
                  key={item.bodyKey}
                  thumbUrl={item.thumbUrl}
                  caption={item.caption}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <MediaViewer
        item={
          selectedItem
            ? {
                bodyUrl: selectedItem.bodyUrl,
                kind: selectedItem.kind,
                caption: selectedItem.caption,
              }
            : null
        }
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
};

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}

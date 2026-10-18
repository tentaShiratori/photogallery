import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useState, useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";
import type { MediaItem, MediaList, YearGroup } from "../../lib/gallery";
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

const Gallery: FC = () => {
  const [groups, setGroups] = useState<readonly YearGroup[]>([]);
  const [status, setStatus] = useState("読み込み中です。");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/media");
      if (!response.ok) {
        setStatus("一覧を取得できませんでした。");
        return;
      }
      const data = (await response.json()) as MediaList;
      const count = data.groups.reduce((sum, group) => sum + group.items.length, 0);
      setGroups(data.groups);
      if (count === 0) {
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
                <MediaTile key={item.key} item={item} onClick={() => setSelectedItem(item)} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <MediaViewer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
};

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}

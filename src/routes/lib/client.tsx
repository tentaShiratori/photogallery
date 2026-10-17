import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useState, useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";
import { MediaItem } from "../../lib/media";

const statusClass = css`
  color: var(--muted);
`;

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const Gallery: FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState("読み込み中です。");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/media");
      if (!response.ok) {
        setStatus("一覧を取得できませんでした。");
        return;
      }
      const data = (await response.json()) as { items: MediaItem[]; truncated: boolean };
      const mediaItems = data.items || [];
      setItems(mediaItems);
      if (mediaItems.length === 0) {
        setStatus("まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。");
      } else {
        setStatus(`${mediaItems.length} 件${data.truncated ? "（上限で打ち切っています）" : ""}`);
      }
    })();
  }, []);

  return (
    <>
      <p class={statusClass} id="status">
        {status}
      </p>
      <div class={gridClass} id="grid">
        {items.map((item) => (
          <MediaTile key={item.key} item={item} onClick={() => setSelectedItem(item)} />
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

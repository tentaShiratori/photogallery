import { render } from "hono/jsx/dom";
import { useState, useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";

type MediaItem = {
  key: string;
  kind: "image" | "video";
  size: number;
  uploaded: string;
  url: string;
};

function fileName(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

const MediaViewer: FC<{
  item: MediaItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  useEffect(() => {
    const dialog = document.getElementById("viewer") as HTMLDialogElement | null;
    if (item) {
      dialog?.showModal();
    } else {
      dialog?.close();
    }
  }, [item]);

  return (
    <dialog id="viewer">
      <button class="close" type="button" onClick={onClose}>
        閉じる
      </button>
      <div id="stage">
        {item &&
          (item.kind === "video" ? (
            <video src={item.url} controls autoplay />
          ) : (
            <img src={item.url} alt={fileName(item.key)} />
          ))}
      </div>
      <p id="caption">{item ? fileName(item.key) : ""}</p>
    </dialog>
  );
};

const MediaTile: FC<{
  item: MediaItem;
  onClick: () => void;
}> = ({ item, onClick }) => (
  <figure>
    <button class="tile" type="button" onClick={onClick}>
      {item.kind === "video" ? (
        <video class="thumb" src={item.url} muted playsInline preload="metadata" />
      ) : (
        <img src={item.url} alt={fileName(item.key)} loading="lazy" />
      )}
    </button>
    <figcaption>{fileName(item.key)}</figcaption>
  </figure>
);

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
      <p class="status" id="status">
        {status}
      </p>
      <div class="grid" id="grid">
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

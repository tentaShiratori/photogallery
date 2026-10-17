import type { FC } from "hono/jsx";

const clientScript = `
const status = document.querySelector("#status");
const grid = document.querySelector("#grid");
const viewer = document.querySelector("#viewer");
const stage = document.querySelector("#stage");
const caption = document.querySelector("#caption");
document.querySelector("#close").addEventListener("click", () => viewer.close());

function fileName(key) {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

function openItem(item) {
  stage.replaceChildren();
  const node = item.kind === "video" ? document.createElement("video") : document.createElement("img");
  node.src = item.url;
  node.alt = fileName(item.key);
  if (item.kind === "video") {
    node.controls = true;
    node.autoplay = true;
  }
  stage.append(node);
  caption.textContent = fileName(item.key);
  viewer.showModal();
}

const response = await fetch("/api/media");
if (!response.ok) {
  status.textContent = "一覧を取得できませんでした。";
} else {
  const data = await response.json();
  const items = data.items || [];
  if (items.length === 0) {
    status.textContent = "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。";
  } else {
    status.textContent = items.length + " 件" + (data.truncated ? "（上限で打ち切っています）" : "");
    for (const item of items) {
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      button.className = "tile";
      button.type = "button";
      const media = item.kind === "video" ? document.createElement("video") : document.createElement("img");
      media.src = item.url;
      media.alt = fileName(item.key);
      if (item.kind === "video") {
        media.className = "thumb";
        media.muted = true;
        media.playsInline = true;
        media.preload = "metadata";
      } else {
        media.loading = "lazy";
      }
      button.append(media);
      button.addEventListener("click", () => openItem(item));
      const cap = document.createElement("figcaption");
      cap.textContent = fileName(item.key);
      figure.append(button, cap);
      grid.append(figure);
    }
  }
}
`;

export const GalleryContent: FC<{ email: string | null }> = ({ email }) => (
  <>
    <header>
      <h1>フォトギャラリー</h1>
      <p class="who">{email ?? "ローカルプレビュー"}</p>
    </header>
    <main>
      <p class="status" id="status">
        読み込み中です。
      </p>
      <div class="grid" id="grid" />
    </main>
    <dialog id="viewer">
      <button class="close" type="button" id="close">
        閉じる
      </button>
      <div id="stage" />
      <p id="caption" />
    </dialog>
    <script type="module" dangerouslySetInnerHTML={{ __html: clientScript }} />
  </>
);

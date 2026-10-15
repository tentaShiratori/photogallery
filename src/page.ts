import { escapeHtml } from "./media.ts";

export function galleryPage(email: string | null): string {
  const who = email
    ? `<p class="who">${escapeHtml(email)}</p>`
    : `<p class="who">ローカルプレビュー</p>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>フォトギャラリー</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ea;
      --ink: #1c1915;
      --muted: #6f675c;
      --line: #ddd6c8;
      --card: #fffdf8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Yu Gothic UI", "Yu Gothic", "Hiragino Sans", sans-serif;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: baseline;
      padding: 28px 32px 12px;
    }
    h1 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .who { margin: 0; color: var(--muted); font-size: 0.9rem; }
    main { padding: 8px 32px 48px; }
    .status { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    figure {
      margin: 0;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    button.tile {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: #ece7dc;
      cursor: pointer;
    }
    img, video.thumb {
      display: block;
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: #ece7dc;
    }
    figcaption {
      padding: 8px 10px 10px;
      font-size: 0.78rem;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    dialog {
      width: min(960px, calc(100vw - 32px));
      border: 0;
      border-radius: 10px;
      padding: 12px;
      background: #111;
      color: #f4f1ea;
    }
    dialog::backdrop { background: rgb(0 0 0 / 72%); }
    dialog img, dialog video {
      display: block;
      max-width: 100%;
      max-height: 78vh;
      margin: 0 auto;
    }
    dialog p { margin: 10px 4px 4px; font-size: 0.85rem; }
    .close {
      float: right;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 1.2rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <h1>フォトギャラリー</h1>
    ${who}
  </header>
  <main>
    <p class="status" id="status">読み込み中です。</p>
    <div class="grid" id="grid"></div>
  </main>
  <dialog id="viewer">
    <button class="close" type="button" id="close">閉じる</button>
    <div id="stage"></div>
    <p id="caption"></p>
  </dialog>
  <script type="module">
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
  </script>
</body>
</html>`;
}

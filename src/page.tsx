import type { FC } from "hono/jsx";

export const GalleryContent: FC<{ email: string | null }> = ({ email }) => (
  <>
    <header>
      <h1>フォトギャラリー</h1>
      <p class="who">{email ?? "ローカルプレビュー"}</p>
    </header>
    <main>
      <div id="gallery-root">
        <p class="status">読み込み中です。</p>
      </div>
    </main>
    <script type="module" src="/client.js" />
  </>
);

import type { FC } from "hono/jsx";
import { AppHanlder } from "../lib/types";

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

function accessEmail(request: Request): string | null {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  return email;
}

export const get: AppHanlder = async (c) => {
  const email = accessEmail(c.req.raw);
  return c.render(<GalleryContent email={email} />, { title: "フォトギャラリー" });
};
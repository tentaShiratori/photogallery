import { css } from "hono/css";
import type { FC } from "hono/jsx";
import { AppHanlder } from "../lib/types";

const headerClass = css`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  padding: 28px 32px 12px;
`;

const titleClass = css`
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
`;

const whoClass = css`
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
`;

const mainClass = css`
  padding: 8px 32px 48px;
`;

const statusClass = css`
  color: var(--muted);
`;

export const GalleryContent: FC<{ email: string | null }> = ({ email }) => (
  <>
    <header class={headerClass}>
      <h1 class={titleClass}>フォトギャラリー</h1>
      <p class={whoClass}>{email ?? "ローカルプレビュー"}</p>
    </header>
    <main class={mainClass}>
      <div id="gallery-root">
        <p class={statusClass}>読み込み中です。</p>
      </div>
    </main>
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

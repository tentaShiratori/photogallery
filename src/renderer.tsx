import { jsxRenderer } from "hono/jsx-renderer";

const styles = `
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
`;

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response;
  }
}

export const renderer = jsxRenderer(
  ({ children, title }) => (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>{children}</body>
    </html>
  ),
  { docType: true },
);

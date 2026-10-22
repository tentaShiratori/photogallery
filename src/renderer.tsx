import { css, Style } from "hono/css";
import { jsxRenderer } from "hono/jsx-renderer";
import { Script, ViteClient } from "vite-ssr-components/hono";
import { TAB_ICON_PATH } from "./lib/tab-icon.ts";

const globalClass = css`
  :-hono-global {
    :root {
      color-scheme: light;
      --bg: #f4f1ea;
      --ink: #1c1915;
      --muted: #6f675c;
      --line: #ddd6c8;
      --card: #fffdf8;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Yu Gothic UI", "Yu Gothic", "Hiragino Sans", sans-serif;
    }
  }
`;

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response;
  }
}

export const renderer = jsxRenderer(
  ({ children, title }) => (
    <html lang="ja" class={globalClass}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{title}</title>
        <link rel="icon" href={TAB_ICON_PATH} type="image/svg+xml" />
        <ViteClient />
        <Style />
        <Script src="/src/routes/lib/client.tsx" />
      </head>
      <body>{children}</body>
    </html>
  ),
  { docType: true },
);

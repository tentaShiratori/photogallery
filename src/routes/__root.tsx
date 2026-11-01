import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import * as React from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "robots",
        content: "noindex",
      },
      {
        title: "フォトギャラリー",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      ...(appCss ? [{ rel: "stylesheet" as const, href: appCss }] : []),
      ...(import.meta.env.DEV ? [{ rel: "stylesheet" as const, href: "/virtual:stylex.css" }] : []),
    ],
    scripts: import.meta.env.DEV ? [{ type: "module", src: "/@id/virtual:stylex:runtime" }] : [],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

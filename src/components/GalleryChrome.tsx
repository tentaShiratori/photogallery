import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const styles = stylex.create({
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "baseline",
    padding: "28px 32px 12px",
  },
  title: {
    margin: "0",
    fontSize: "1.6rem",
    fontWeight: "600",
    letterSpacing: "0.04em",
  },
  who: {
    margin: "0",
    color: "var(--muted)",
    fontSize: "0.9rem",
  },
  main: {
    padding: "8px 32px 48px",
  },
});

export const getAccessEmail = createServerOnlyFn(() => getRequestHeader("Cf-Access-Authenticated-User-Email") ?? null);

export function GalleryChrome({ email, children }: { email: string | null; children: ReactNode }) {
  return (
    <>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>フォトギャラリー</h1>
        <p {...stylex.props(styles.who)}>{email ?? "ローカルプレビュー"}</p>
      </header>
      <main {...stylex.props(styles.main)}>{children}</main>
    </>
  );
}

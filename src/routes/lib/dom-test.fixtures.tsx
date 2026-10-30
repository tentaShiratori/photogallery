import { Style } from "hono/jsx/dom/css";
import { render } from "hono/jsx/dom";
import type { Child } from "hono/jsx";

/** Ensure `#hono-css` exists so hono/jsx/dom can insert rules for `css\`\``. */
export function ensureHonoStyle(): void {
  if (document.querySelector("style#hono-css")) return;
  const host = document.createElement("div");
  document.head.append(host);
  render(<Style />, host);
}

/** Mount hono/css Style sheet, then render `node` into a fresh root under document.body. */
export function mountDom(node: Child): HTMLDivElement {
  ensureHonoStyle();
  const root = document.createElement("div");
  document.body.append(root);
  render(node, root);
  return root;
}

export function clearDom(): void {
  document.body.replaceChildren();
  document.head.querySelectorAll("style#hono-css").forEach((node) => node.parentElement?.remove());
}

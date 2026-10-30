import { render } from "hono/jsx/dom";
import type { Child } from "hono/jsx";

/** Ensure `#hono-css` exists so hono/jsx/dom can insert rules for `css\`\``. */
function ensureHonoStyle(): void {
  if (document.querySelector("style#hono-css")) return;
  const style = document.createElement("style");
  style.id = "hono-css";
  document.head.appendChild(style);
}

/** Mount hono/css Style sheet, then render `node` into a fresh root under document.body. */
export function mountDom(node: Child): HTMLDivElement {
  ensureHonoStyle();
  const root = document.createElement("div");
  document.body.appendChild(root);
  render(node, root);
  return root;
}

export function clearDom(): void {
  document.body.replaceChildren();
  document.head.querySelectorAll("style#hono-css").forEach((node) => {
    node.parentElement?.removeChild(node);
  });
}

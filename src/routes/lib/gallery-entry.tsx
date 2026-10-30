import { render } from "hono/jsx/dom";
import { Gallery } from "./client";

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}

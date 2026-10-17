import { Hono } from "hono";
import * as root from "./routes/index.tsx";
import * as media from "./routes/media.ts";
import * as apiMedia from "./routes/api/media.ts";
import { renderer } from "./renderer.tsx";
import { Env } from "./lib/types.ts";

const app = new Hono<{ Bindings: Env }>();
app.use(renderer);
app.get("/", root.get);
app.get("/api/media", apiMedia.get);
app.get("/media/*", media.get);
app.notFound((c) => c.text("見つかりません。", 404));

export default app;

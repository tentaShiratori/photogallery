import { Handler } from "hono";

export type Env = Cloudflare.Env;
export type AppHanlder = Handler<{ Bindings: Env }>;

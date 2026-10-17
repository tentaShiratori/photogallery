import { Handler } from "hono";

export interface Env {
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
}
export type AppHanlder = Handler<{ Bindings: Env }>;

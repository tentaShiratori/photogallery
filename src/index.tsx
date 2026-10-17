import { Hono } from "hono";
import {
  byteContentRange,
  contentTypeForName,
  keyFromMediaPath,
  kindForName,
  mediaPath,
} from "./media.ts";
import { GalleryContent } from "./page.tsx";
import { renderer } from "./renderer.tsx";

export interface Env {
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
}

const LIST_PAGE_SIZE = 1000;
const MAX_LIST_PAGES = 20;

type MediaItem = {
  key: string;
  kind: "image" | "video";
  size: number;
  uploaded: string;
  url: string;
};

export async function listMedia(
  bucket: R2Bucket,
): Promise<{ items: MediaItem[]; truncated: boolean }> {
  const items: MediaItem[] = [];
  let cursor: string | undefined;
  let pages = 0;
  let truncated = false;

  while (pages < MAX_LIST_PAGES) {
    const listed = await bucket.list({ cursor, limit: LIST_PAGE_SIZE });
    pages += 1;
    for (const object of listed.objects) {
      const kind = kindForName(object.key);
      if (!kind) continue;
      items.push({
        key: object.key,
        kind,
        size: object.size,
        uploaded: object.uploaded.toISOString(),
        url: mediaPath(object.key),
      });
    }
    if (!listed.truncated || !listed.cursor) {
      truncated = false;
      break;
    }
    cursor = listed.cursor;
    truncated = pages >= MAX_LIST_PAGES;
  }

  items.sort((a, b) => b.uploaded.localeCompare(a.uploaded) || a.key.localeCompare(b.key));
  return { items, truncated };
}

function accessEmail(request: Request): string | null {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  return email;
}

async function serveObject(request: Request, bucket: R2Bucket, key: string): Promise<Response> {
  const range = request.headers.get("Range");
  const object = await bucket.get(key, range ? { range: request.headers } : undefined);
  if (object === null) {
    return new Response("見つかりません。", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", contentTypeForName(key));
  }
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600");

  if (range && object.range) {
    const contentRange = byteContentRange(object.range, object.size);
    if (contentRange) {
      headers.set("content-range", contentRange);
      return new Response(object.body, { status: 206, headers });
    }
  }

  return new Response(object.body, { headers });
}

const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.get("/", (c) => {
  const email = accessEmail(c.req.raw);
  return c.render(<GalleryContent email={email} />, { title: "フォトギャラリー" });
});

app.get("/api/media", async (c) => {
  const body = await listMedia(c.env.MEDIA);
  return c.json(body, {
    headers: { "cache-control": "private, no-store" },
  });
});

app.get("/media/*", async (c) => {
  const key = keyFromMediaPath(c.req.path);
  if (!key || !kindForName(key)) {
    return c.text("見つかりません。", 404);
  }
  return serveObject(c.req.raw, c.env.MEDIA, key);
});

app.notFound((c) => c.text("見つかりません。", 404));

export default app;

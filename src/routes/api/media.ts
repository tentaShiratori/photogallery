import { kindForName, MediaItem } from "../../lib/media";
import { AppHanlder } from "../../lib/types";
function mediaPath(key: string): string {
  const encoded = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/media/${encoded}`;
}

const LIST_PAGE_SIZE = 1000;
const MAX_LIST_PAGES = 20;

async function listMedia(bucket: R2Bucket): Promise<{ items: MediaItem[]; truncated: boolean }> {
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

export const get: AppHanlder = async (c) => {
  const body = await listMedia(c.env.MEDIA);
  return c.json(body, {
    headers: { "cache-control": "private, no-store" },
  });
};

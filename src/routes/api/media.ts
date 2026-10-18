import { assembleGallery, type MediaList, type ObjectHead } from "../../lib/gallery";
import { AppHanlder } from "../../lib/types";

const LIST_PAGE_SIZE = 1000;
const MAX_LIST_PAGES = 20;

async function listHeads(bucket: R2Bucket): Promise<{ heads: ObjectHead[]; truncated: boolean }> {
  const heads: ObjectHead[] = [];
  let cursor: string | undefined;
  let pages = 0;
  let truncated = false;

  while (pages < MAX_LIST_PAGES) {
    const listed = await bucket.list({ cursor, limit: LIST_PAGE_SIZE });
    pages += 1;
    for (const object of listed.objects) {
      heads.push({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded.toISOString(),
      });
    }
    if (!listed.truncated || !listed.cursor) {
      truncated = false;
      break;
    }
    cursor = listed.cursor;
    truncated = pages >= MAX_LIST_PAGES;
  }

  return { heads, truncated };
}

export const get: AppHanlder = async (c) => {
  const listed = await listHeads(c.env.MEDIA);
  const view = assembleGallery(listed.heads);
  return c.json({ truncated: listed.truncated, groups: view.groups } satisfies MediaList, {
    headers: { "cache-control": "private, no-store" },
  });
};

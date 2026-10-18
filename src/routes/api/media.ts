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

async function readObjectRange(
  bucket: R2Bucket,
  key: string,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  const object = await bucket.get(key, { range: { offset, length } });
  if (!object) return new Uint8Array();
  return new Uint8Array(await object.arrayBuffer());
}

export const get: AppHanlder = async (c) => {
  const listed = await listHeads(c.env.MEDIA);
  const view = await assembleGallery(listed.heads, (key, offset, length) =>
    readObjectRange(c.env.MEDIA, key, offset, length),
  );
  return c.json({ truncated: listed.truncated, groups: view.groups } satisfies MediaList, {
    headers: { "cache-control": "private, no-store" },
  });
};

import { galleryFromHeads, type BucketHead } from "../../lib/pair";
import { AppHanlder } from "../../lib/types";

const OBJECT_CAP = 20_000;
const R2_LIST_LIMIT_MAX = 1_000;

type ListBudget = {
  readonly pageSize: number;
  readonly maxPages: number;
};

function listBudget(pageSize: number): ListBudget {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > R2_LIST_LIMIT_MAX) {
    throw new Error(`1 回の件数は 1 から ${R2_LIST_LIMIT_MAX} です: ${pageSize}`);
  }
  if (OBJECT_CAP % pageSize !== 0) {
    throw new Error(`上限 ${OBJECT_CAP} は 1 回 ${pageSize} 件で割り切れません。`);
  }
  return { pageSize, maxPages: OBJECT_CAP / pageSize };
}

export const LIST_BUDGET = listBudget(200);

async function listHeads(bucket: R2Bucket): Promise<{ heads: BucketHead[]; truncated: boolean }> {
  const heads: BucketHead[] = [];
  let cursor: string | undefined;
  let pages = 0;
  let truncated = false;

  while (pages < LIST_BUDGET.maxPages) {
    const listed = await bucket.list({ cursor, limit: LIST_BUDGET.pageSize });
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
    truncated = pages >= LIST_BUDGET.maxPages;
  }

  return { heads, truncated };
}

export const get: AppHanlder = async (c) => {
  const listed = await listHeads(c.env.MEDIA);
  return c.json(galleryFromHeads(listed.heads, listed.truncated), {
    headers: { "cache-control": "private, no-store" },
  });
};

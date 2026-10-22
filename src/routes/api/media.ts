import { parseYear, readPage, type Year, type YearGroup } from "../../lib/pair";
import { AppHanlder } from "../../lib/types";

export type MediaPage = {
  readonly group: YearGroup | null;
  readonly next: string | null;
};

const NO_STORE = { "cache-control": "private, no-store" };

function hrefAfter(year: Year): string {
  return `/api/media?after=${year}`;
}

export const get: AppHanlder = async (c) => {
  const raw = c.req.query("after");
  const after = raw === undefined ? null : parseYear(raw);
  if (raw !== undefined && after === null) {
    return c.text("after が年ではありません。", 400, NO_STORE);
  }
  const page = await readPage(c.env.MEDIA, after);
  const body: MediaPage = {
    group: page.group,
    next: page.next === null ? null : hrefAfter(page.next),
  };
  return c.json(body, { headers: NO_STORE });
};

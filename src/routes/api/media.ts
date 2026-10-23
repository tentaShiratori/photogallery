import {
  parseYearQuery,
  readYearContents,
  readYearList,
  type Media,
  type YearGroup,
} from "../../lib/pair";
import { AppHanlder } from "../../lib/types";

export type YearListResponse = {
  readonly years: readonly {
    readonly label: string;
    readonly previews: readonly Media[];
  }[];
};

export type YearScreenResponse = {
  readonly group: YearGroup | null;
  readonly next: null;
};

const NO_STORE = { "cache-control": "private, no-store" };

export const get: AppHanlder = async (c) => {
  const yearRaw = c.req.query("year");
  if (yearRaw !== undefined) {
    const query = parseYearQuery(yearRaw);
    if (query === null) return c.text("year が不正です。", 400, NO_STORE);
    const group = await readYearContents(c.env.MEDIA, query);
    const body: YearScreenResponse = { group, next: null };
    return c.json(body, { headers: NO_STORE });
  }
  const list = await readYearList(c.env.MEDIA);
  const body: YearListResponse = { years: list.years };
  return c.json(body, { headers: NO_STORE });
};

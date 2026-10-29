import * as v from "valibot";
import type { YearListResponse, YearScreenResponse } from "../../lib/media-response.ts";
import { readYearContents, readYearList, serverTimingHeader, timedLister, yearQuerySchema } from "../../lib/pair";
import { AppHanlder } from "../../lib/types";

export type { YearListResponse, YearScreenResponse };

const NO_STORE = { "cache-control": "private, no-store" };

export const get: AppHanlder = async (c) => {
  const yearRaw = c.req.query("year");
  if (yearRaw !== undefined) {
    const parsed = v.safeParse(yearQuerySchema, yearRaw);
    if (!parsed.success) return c.text("year が不正です。", 400, NO_STORE);
    const group = await readYearContents(c.env.MEDIA, parsed.output);
    const body: YearScreenResponse = { group, next: null };
    return c.json(body, { headers: NO_STORE });
  }
  const started = performance.now();
  const timed = timedLister(c.env.MEDIA);
  const list = await readYearList(timed.bucket);
  const body: YearListResponse = { years: list.years };
  const totalDurationMs = performance.now() - started;
  return c.json(body, {
    headers: {
      ...NO_STORE,
      "server-timing": serverTimingHeader(timed.stats(), totalDurationMs),
    },
  });
};

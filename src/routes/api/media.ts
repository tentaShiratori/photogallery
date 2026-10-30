import * as v from "valibot";
import type { YearListResponse, YearScreenResponse } from "../../lib/media-response.ts";
import { readYearContents, readYearList, serverTimingHeader, timedLister, yearQuerySchema } from "../../lib/media";
import { AppHanlder } from "../../lib/types";

export type { YearListResponse, YearScreenResponse };

const NO_STORE = { "cache-control": "private, no-store" };

function jsonWithTiming(timed: ReturnType<typeof timedLister>, started: number) {
  return {
    headers: {
      ...NO_STORE,
      "server-timing": serverTimingHeader(timed.stats(), performance.now() - started),
    },
  };
}

export const get: AppHanlder = async (c) => {
  const yearRaw = c.req.query("year");
  if (yearRaw !== undefined) {
    const parsed = v.safeParse(yearQuerySchema, yearRaw);
    if (!parsed.success) return c.text("year が不正です。", 400, NO_STORE);
    const started = performance.now();
    const timed = timedLister(c.env.MEDIA);
    const group = await readYearContents(timed.bucket, parsed.output);
    const body: YearScreenResponse = { group, next: null };
    return c.json(body, jsonWithTiming(timed, started));
  }
  const started = performance.now();
  const timed = timedLister(c.env.MEDIA);
  const list = await readYearList(timed.bucket);
  const body: YearListResponse = { years: list.years };
  return c.json(body, jsonWithTiming(timed, started));
};

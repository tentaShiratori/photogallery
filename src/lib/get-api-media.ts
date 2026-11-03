import * as v from "valibot";
import type { YearListResponse, YearScreenResponse } from "./media-response.ts";
import { readYearContents, readYearList, serverTimingHeader, timedLister, yearQuerySchema } from "./media";

const NO_STORE = { "cache-control": "private, no-store" };

function jsonWithTiming(timed: ReturnType<typeof timedLister>, started: number) {
  return {
    headers: {
      ...NO_STORE,
      "server-timing": serverTimingHeader(timed.stats(), performance.now() - started),
    },
  };
}

export async function getApiMedia(request: Request, bucket: R2Bucket): Promise<Response> {
  const yearRaw = new URL(request.url).searchParams.get("year");
  if (yearRaw != null) {
    const parsed = v.safeParse(yearQuerySchema, yearRaw);
    if (!parsed.success) return new Response("year が不正です。", { status: 400, headers: NO_STORE });
    const started = performance.now();
    const timed = timedLister(bucket);
    const group = await readYearContents(timed.bucket, parsed.output);
    const body: YearScreenResponse = { group, next: null };
    return Response.json(body, jsonWithTiming(timed, started));
  }
  const started = performance.now();
  const timed = timedLister(bucket);
  const list = await readYearList(timed.bucket);
  const body: YearListResponse = { years: list.years };
  return Response.json(body, jsonWithTiming(timed, started));
}

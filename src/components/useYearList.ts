import { useEffect, useLayoutEffect, useReducer } from "react";
import { parseYearListResponse } from "../lib/media-response";
import { initialYearList, yearListReducer, yearListView, type YearListState } from "./feed";
import { markYearList, waitForYearListThumbs } from "./year-list/perf";

let cachedYearList: YearListState | null = null;

/** Clears the in-memory year list cache between unit tests. */
export function resetYearListCache(): void {
  cachedYearList = null;
}

export function useYearList() {
  const [yearList, dispatchList] = useReducer(yearListReducer, null, () => cachedYearList ?? initialYearList);

  useLayoutEffect(() => {
    if (yearList.status === "loading") markYearList.loading();
  }, [yearList.status]);

  useEffect(() => {
    if (yearList.status === "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/media");
        markYearList.api();
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseYearListResponse(await response.json());
        if (cancelled) return;
        const next: YearListState = { status: "ready", years: parsed.years };
        cachedYearList = next;
        dispatchList({ type: "loaded", years: parsed.years });
      } catch {
        if (!cancelled) dispatchList({ type: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [yearList.status]);

  useEffect(() => {
    if (yearList.status !== "ready") return;
    let cancelled = false;
    void waitForYearListThumbs().then(() => {
      if (!cancelled) markYearList.ready();
    });
    return () => {
      cancelled = true;
    };
  }, [yearList]);

  return yearListView(yearList);
}

import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { parseYearListResponse } from "../lib/media-response";
import { initialYearList, yearListReducer, yearListView, type YearListState } from "./feed";
import { markYearList, waitForYearListThumbs } from "./year-list/perf";

let yearListCache: YearListState | null = null;

/** Clears the in-memory year-list cache. Tests call this between cases. */
export function resetYearListCache(): void {
  yearListCache = null;
}

export function useYearList() {
  const [yearList, dispatchList] = useReducer(yearListReducer, null, () => yearListCache ?? initialYearList);
  const listLoaded = useRef(false);

  useLayoutEffect(() => {
    if (yearList.status === "loading") markYearList.loading();
  }, [yearList.status]);

  useEffect(() => {
    if (listLoaded.current) return;
    listLoaded.current = true;
    if (yearListCache?.status === "ready") return;
    void (async () => {
      try {
        const response = await fetch("/api/media");
        markYearList.api();
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseYearListResponse(await response.json());
        const next: YearListState = { status: "ready", years: parsed.years };
        yearListCache = next;
        dispatchList({ type: "loaded", years: parsed.years });
      } catch {
        dispatchList({ type: "failed" });
      }
    })();
  }, []);

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

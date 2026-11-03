import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { parseYearListResponse } from "../lib/media-response";
import { initialYearList, yearListReducer, yearListView } from "./feed";
import { markYearList, waitForYearListThumbs } from "./year-list/perf";

export function useYearList() {
  const [yearList, dispatchList] = useReducer(yearListReducer, initialYearList);
  const listLoaded = useRef(false);

  useLayoutEffect(() => {
    if (yearList.status === "loading") markYearList.loading();
  }, [yearList.status]);

  useEffect(() => {
    if (listLoaded.current) return;
    listLoaded.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/media");
        markYearList.api();
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseYearListResponse(await response.json());
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

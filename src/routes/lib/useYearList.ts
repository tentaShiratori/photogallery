import { useEffect, useLayoutEffect, useReducer, useRef } from "hono/jsx";
import { parseYearListResponse } from "../../lib/media-response.ts";
import { initialYearList, yearListReducer, yearListView } from "./feed";
import { markYearList, waitForYearListThumbs } from "./year-list/perf";

export function useYearList(yearToken: string | null) {
  const [yearList, dispatchList] = useReducer(yearListReducer, initialYearList);
  const listLoaded = useRef(false);

  useLayoutEffect(() => {
    if (yearToken !== null) return;
    if (yearList.status === "loading") markYearList.loading();
  }, [yearToken, yearList.status]);

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
    if (yearToken !== null) return;
    if (yearList.status !== "ready") return;
    let cancelled = false;
    void waitForYearListThumbs().then(() => {
      if (!cancelled) markYearList.ready();
    });
    return () => {
      cancelled = true;
    };
  }, [yearToken, yearList]);

  return yearListView(yearList);
}

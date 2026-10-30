import { useEffect, useReducer, useRef, useState } from "hono/jsx";
import { parseYearScreenResponse } from "../../lib/media-response.ts";
import { initialYearScreen, yearApiHref, yearScreenReducer, yearScreenStep, yearScreenView } from "./feed";

const NEAR_BOTTOM_PX = 600;

export function useYearFeed(yearToken: string | null) {
  const [yearFeed, dispatchYear] = useReducer(yearScreenReducer, initialYearScreen);
  const [scrolls, setScrolls] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const yearFetchId = useRef(0);

  useEffect(() => {
    if (yearToken === null) {
      dispatchYear({ type: "reset" });
      return;
    }
    const href = yearApiHref(yearToken);
    const fetchId = ++yearFetchId.current;
    dispatchYear({ type: "reset" });
    void (async () => {
      try {
        const response = await fetch(href);
        if (!response.ok) throw new Error(String(response.status));
        const screen = parseYearScreenResponse(await response.json());
        if (fetchId !== yearFetchId.current) return;
        dispatchYear({ type: "loaded", href, screen });
      } catch {
        if (fetchId !== yearFetchId.current) return;
        dispatchYear({ type: "failed", href });
      }
    })();
  }, [yearToken]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(() => setScrolls((count) => count + 1), {
      rootMargin: `0px 0px ${NEAR_BOTTOM_PX}px 0px`,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [yearToken]);

  useEffect(() => {
    if (yearToken === null) return;
    const top = sentinel.current?.getBoundingClientRect().top ?? Infinity;
    const nearBottom = top <= window.innerHeight + NEAR_BOTTOM_PX;
    const step = yearScreenStep(yearFeed, nearBottom);
    if (step.kind === "reveal") dispatchYear({ type: "reveal" });
  }, [yearToken, yearFeed, scrolls]);

  return { screenView: yearScreenView(yearFeed), sentinel };
}

import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "hono/jsx";
import type { FC } from "hono/jsx";
import { schoolGradeForLabel } from "../../lib/school-grade.ts";
import {
  initialYearList,
  initialYearScreen,
  parseYearList,
  parseYearScreen,
  yearApiHref,
  yearListReducer,
  yearListView,
  yearScreenReducer,
  yearScreenStep,
  yearScreenView,
  type ParsedMedia,
} from "./feed";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";
import { schoolGradeClass, YearCard, yearHeadClass } from "./YearCard";
import {
  markYearList,
  waitForYearListThumbs,
  YEAR_LIST_MARK_API,
  YEAR_LIST_MARK_LOADING,
  YEAR_LIST_MARK_READY,
} from "./year-list-perf";
import { readYearFromLocation, writeYearToLocation } from "./year-location";

const NEAR_BOTTOM_PX = 600;
const SCROLL_KEY = "photogallery-year-list-scroll";

const statusClass = css`
  color: var(--muted);
`;

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const headingClass = css`
  margin: 18px 0 10px;
  font-size: 1.05rem;
  font-weight: 600;
`;

const noticeClass = css`
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 400;
`;

const yearListDesktopClass = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
`;

const backLinkClass = css`
  color: var(--muted);
  text-decoration: none;
  font-size: 0.9rem;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
  text-align: left;
  &:hover {
    color: var(--ink);
    text-decoration: underline;
  }
`;

const Gallery: FC = () => {
  const [yearToken, setYearToken] = useState<string | null>(() => readYearFromLocation());
  const [yearList, dispatchList] = useReducer(yearListReducer, initialYearList);
  const [yearFeed, dispatchYear] = useReducer(yearScreenReducer, initialYearScreen);
  const [scrolls, setScrolls] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const listLoaded = useRef(false);
  const yearFetchId = useRef(0);

  const openYear = useCallback((token: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    writeYearToLocation(token);
    setYearToken(token);
  }, []);

  const backToList = useCallback(() => {
    writeYearToLocation(null);
    setYearToken(null);
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      const y = Number(saved);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, []);

  useEffect(() => {
    const onPop = () => setYearToken(readYearFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    if (yearToken !== null) return;
    if (yearList.status === "loading") markYearList(YEAR_LIST_MARK_LOADING);
  }, [yearToken, yearList.status]);

  useEffect(() => {
    if (listLoaded.current) return;
    listLoaded.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/media");
        markYearList(YEAR_LIST_MARK_API);
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseYearList(await response.json());
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
      if (!cancelled) markYearList(YEAR_LIST_MARK_READY);
    });
    return () => {
      cancelled = true;
    };
  }, [yearToken, yearList]);

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
        const screen = parseYearScreen(await response.json());
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

  const listView = yearListView(yearList);
  const screenView = yearScreenView(yearFeed);
  const screenGrade = screenView.label !== null ? schoolGradeForLabel(screenView.label) : null;

  if (yearToken !== null) {
    return (
      <>
        <div class={yearHeadClass}>
          <button class={backLinkClass} type="button" onClick={backToList}>
            ← 年の一覧へ
          </button>
          {screenView.label !== null && (
            <h2 class={headingClass}>
              {screenView.label}
              {screenGrade !== null && <span class={schoolGradeClass}>{screenGrade}</span>}
              {screenView.notice !== null && <span class={noticeClass}> {screenView.notice}</span>}
            </h2>
          )}
        </div>
        {screenView.status !== null && (
          <p class={statusClass} id="status">
            {screenView.status}
          </p>
        )}
        <div id="grid">
          <div class={gridClass}>
            {screenView.tiles.map((item) => (
              <MediaTile
                key={item.bodyKey}
                thumbUrl={item.thumbUrl}
                caption={item.caption}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
        <div ref={sentinel} id="sentinel" />
        <MediaViewer
          item={
            selectedItem
              ? {
                  bodyUrl: selectedItem.bodyUrl,
                  kind: selectedItem.kind,
                  caption: selectedItem.caption,
                }
              : null
          }
          onClose={() => setSelectedItem(null)}
        />
      </>
    );
  }

  return (
    <>
      {listView.status !== null && (
        <p class={statusClass} id="status">
          {listView.status}
        </p>
      )}
      <div id="year-list" class={yearListDesktopClass}>
        {listView.years.map((card) => (
          <YearCard key={card.label} card={card} onOpen={openYear} />
        ))}
      </div>
    </>
  );
};

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}

import { css } from "hono/css";
import { useCallback, useEffect, useState } from "hono/jsx";
import type { FC } from "hono/jsx";
import { schoolGradeForLabel } from "../../lib/school-grade.ts";
import { markEnlarged } from "./enlarged/perf";
import type { ParsedMedia } from "./feed";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";
import { useYearFeed } from "./useYearFeed";
import { useYearList } from "./useYearList";
import { schoolGradeClass, YearCard, yearHeadClass } from "./year-list/YearCard";
import { readYearFromLocation, writeYearToLocation } from "./year-list/location";

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

export const Gallery: FC = () => {
  const [yearToken, setYearToken] = useState<string | null>(() => readYearFromLocation());
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);
  const listView = useYearList(yearToken);
  const { screenView, sentinel } = useYearFeed(yearToken);

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
                kind={item.kind}
                thumbUrl={item.thumbUrl}
                caption={item.caption}
                onClick={() => {
                  markEnlarged.open();
                  setSelectedItem(item);
                }}
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

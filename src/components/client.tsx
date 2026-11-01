import { schoolGradeForLabel } from "../lib/school-grade.ts";
import { markEnlarged } from "./enlarged/perf";
import type { ParsedMedia } from "./feed";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";
import { useYearFeed } from "./useYearFeed";
import { useYearList } from "./useYearList";
import { styles as yearCardStyles, YearCard } from "./year-list/YearCard";
import { readYearFromLocation, writeYearToLocation } from "./year-list/location";
import { FC, useState, useCallback, useEffect } from "react";
import * as stylex from "@stylexjs/stylex";
const SCROLL_KEY = "photogallery-year-list-scroll";

const styles = stylex.create({
  status: {
    color: "var(--muted)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "14px",
  },
  heading: {
    margin: "18px 0 10px",
    fontSize: "1.05rem",
    fontWeight: "600",
  },
  notice: {
    color: "var(--muted)",
    fontSize: "0.88rem",
    fontWeight: "400",
  },
  yearListDesktop: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    "@media (max-width: 640px)": {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
  },
  backLink: {
    color: {
      default: "var(--muted)",
      ":hover": "var(--ink)",
    },
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
    fontSize: "0.9rem",
    borderWidth: "0",
    borderStyle: "none",
    backgroundColor: "transparent",
    padding: "0",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
  },
});

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
        <div {...stylex.props(yearCardStyles.yearHead)}>
          <button {...stylex.props(styles.backLink)} type="button" onClick={backToList}>
            ← 年の一覧へ
          </button>
          {screenView.label !== null && (
            <h2 {...stylex.props(styles.heading)}>
              {screenView.label}
              {screenGrade !== null && <span {...stylex.props(yearCardStyles.schoolGrade)}>{screenGrade}</span>}
              {screenView.notice !== null && <span {...stylex.props(styles.notice)}> {screenView.notice}</span>}
            </h2>
          )}
        </div>
        {screenView.status !== null && (
          <p {...stylex.props(styles.status)} id="status">
            {screenView.status}
          </p>
        )}
        <div id="grid">
          <div {...stylex.props(styles.grid)}>
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
        <p {...stylex.props(styles.status)} id="status">
          {listView.status}
        </p>
      )}
      <div {...stylex.props(styles.yearListDesktop)} id="year-list">
        {listView.years.map((card) => (
          <YearCard key={card.label} card={card} onOpen={openYear} />
        ))}
      </div>
    </>
  );
};

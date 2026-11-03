import { Link } from "@tanstack/react-router";
import { schoolGradeForLabel } from "../../lib/school-grade.ts";
import { markEnlarged } from "../enlarged/perf";
import type { ParsedMedia } from "../feed";
import { MediaTile } from "../MediaTile";
import { MediaViewer } from "../MediaViewer";
import { useYearFeed } from "../useYearFeed";
import { styles as yearCardStyles } from "../year-list/YearCard";
import { FC, useState } from "react";
import * as stylex from "@stylexjs/stylex";

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
  },
});

export const YearScreen: FC<{ yearToken: string }> = ({ yearToken }) => {
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);
  const { screenView, sentinel } = useYearFeed(yearToken);
  const screenGrade = screenView.label !== null ? schoolGradeForLabel(screenView.label) : null;

  return (
    <>
      <div {...stylex.props(yearCardStyles.yearHead)}>
        <Link to="/" {...stylex.props(styles.backLink)}>
          ← 年の一覧へ
        </Link>
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
};

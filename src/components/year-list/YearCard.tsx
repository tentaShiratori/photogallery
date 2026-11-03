import { schoolGradeForLabel } from "../../lib/school-grade.ts";
import type { ParsedMedia, ParsedYearCard } from "../feed";
import { blankBrokenImage } from "../blank-image";
import { yearTokenFromLabel } from "./location";
import { FC } from "react";
import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  thumbs2x2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },
  previewThumb: {
    display: "block",
    width: "100%",
    height: { default: "120px", "@media (max-width: 640px)": "72px" },
    objectFit: "cover",
    borderRadius: "6px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--line)",
    backgroundColor: "#ece7dc",
  },
  yearCard: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
    margin: "0",
    padding: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "var(--line)",
      ":hover": "#c9c0ae",
    },
    borderRadius: "12px",
    backgroundColor: {
      default: "var(--card)",
      ":hover": "#fffaf0",
    },
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    color: "inherit",
  },
  yearLabel: {
    fontSize: { default: "1.35rem", "@media (max-width: 640px)": "1.2rem" },
    fontWeight: "650",
  },
  yearLabelUnknown: {
    fontSize: { default: "1.1rem", "@media (max-width: 640px)": "1rem" },
    fontWeight: "650",
  },
  schoolGrade: {
    marginLeft: "0.4em",
    color: "var(--muted)",
    fontSize: "0.72em",
    fontWeight: "400",
  },
  yearHead: {
    position: "sticky",
    top: "0",
    zIndex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    margin: "4px 0 16px",
    padding: "8px 0",
    backgroundColor: "var(--bg)",
  },
});

const PreviewGrid: FC<{
  previews: readonly ParsedMedia[];
}> = ({ previews }) => (
  <div {...stylex.props(styles.thumbs2x2)}>
    {previews.map((item) => (
      <img
        key={item.bodyKey}
        {...stylex.props(styles.previewThumb)}
        src={item.thumbUrl}
        alt=""
        loading="lazy"
        onError={blankBrokenImage}
      />
    ))}
  </div>
);

export const YearCard: FC<{
  card: ParsedYearCard;
  onOpen: (yearToken: string) => void;
}> = ({ card, onOpen }) => {
  const token = yearTokenFromLabel(card.label);
  const grade = schoolGradeForLabel(card.label);
  const open = () => onOpen(token);
  return (
    <button {...stylex.props(styles.yearCard)} type="button" onClick={open}>
      <span {...stylex.props(card.label === "年不明" ? styles.yearLabelUnknown : styles.yearLabel)}>
        {card.label}
        {grade !== null && <span {...stylex.props(styles.schoolGrade)}>{grade}</span>}
      </span>
      <PreviewGrid previews={card.previews} />
    </button>
  );
};

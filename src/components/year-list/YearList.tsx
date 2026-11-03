import type { FC } from "react";
import * as stylex from "@stylexjs/stylex";
import { useYearList } from "../useYearList";
import { YearCard } from "./YearCard";

const styles = stylex.create({
  status: {
    color: "var(--muted)",
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
});

export const YearList: FC = () => {
  const listView = useYearList();
  return (
    <>
      {listView.status !== null && (
        <p {...stylex.props(styles.status)} id="status">
          {listView.status}
        </p>
      )}
      <div {...stylex.props(styles.yearListDesktop)} id="year-list">
        {listView.years.map((card) => (
          <YearCard key={card.label} card={card} />
        ))}
      </div>
    </>
  );
};

import { css } from "hono/css";
import type { FC } from "hono/jsx";
import { schoolGradeForLabel } from "../../../lib/school-grade.ts";
import type { ParsedMedia, ParsedYearCard } from "../feed";
import { yearTokenFromLabel } from "./location";

const thumbs2x2Class = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const previewThumbClass = css`
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #ece7dc;
  @media (max-width: 640px) {
    height: 72px;
  }
`;

const yearCardClass = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  &:hover {
    border-color: #c9c0ae;
    background: #fffaf0;
  }
`;

const yearLabelClass = css`
  font-size: 1.35rem;
  font-weight: 650;
  @media (max-width: 640px) {
    font-size: 1.2rem;
  }
`;

const yearLabelUnknownClass = css`
  font-size: 1.1rem;
  font-weight: 650;
  @media (max-width: 640px) {
    font-size: 1rem;
  }
`;

export const schoolGradeClass = css`
  margin-left: 0.4em;
  color: var(--muted);
  font-size: 0.72em;
  font-weight: 400;
`;

export const yearHeadClass = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 16px;
`;

const PreviewGrid: FC<{
  previews: readonly ParsedMedia[];
  onOpen: () => void;
}> = ({ previews, onOpen }) => (
  <div class={thumbs2x2Class}>
    {previews.map((item) => (
      <button
        key={item.bodyKey}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
      >
        <img class={previewThumbClass} src={item.thumbUrl} alt="" loading="lazy" />
      </button>
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
    <button class={yearCardClass} type="button" onClick={open}>
      <span class={card.label === "年不明" ? yearLabelUnknownClass : yearLabelClass}>
        {card.label}
        {grade !== null && <span class={schoolGradeClass}>{grade}</span>}
      </span>
      <PreviewGrid previews={card.previews} onOpen={open} />
    </button>
  );
};

import type { MediaKind } from "../lib/kind";
import type { ThumbUrl } from "../lib/name";
import { FC } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  figure: {
    margin: "0",
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  tile: {
    display: "block",
    width: "100%",
    padding: "0",
    border: "0",
    background: "#ece7dc",
    cursor: "pointer",
  },
  media: {
    display: "block",
    width: "100%",
    height: "180px",
    objectFit: "cover",
    background: "#ece7dc",
  },
  caption: {
    padding: "8px 10px 10px",
    fontSize: "0.78rem",
    color: "var(--muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

export const MediaTile: FC<{
  kind: MediaKind;
  thumbUrl: ThumbUrl;
  caption: string;
  onClick: () => void;
}> = ({ kind, thumbUrl, caption, onClick }) => (
  <figure {...stylex.props(styles.figure)}>
    <button {...stylex.props(styles.tile)} type="button" data-kind={kind} onClick={onClick}>
      <img {...stylex.props(styles.media)} src={thumbUrl} alt={caption} loading="lazy" />
    </button>
    <figcaption {...stylex.props(styles.caption)}>{caption}</figcaption>
  </figure>
);

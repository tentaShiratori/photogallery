import type { MediaKind } from "../lib/kind";
import type { ThumbUrl } from "../lib/name";
import { FC } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  figure: {
    margin: "0",
    backgroundColor: "var(--card)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--line)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  tile: {
    display: "block",
    width: "100%",
    padding: "0",
    borderWidth: "0",
    borderStyle: "none",
    backgroundColor: "#ece7dc",
    cursor: "pointer",
  },
  media: {
    display: "block",
    width: "100%",
    height: "180px",
    objectFit: "cover",
    backgroundColor: "#ece7dc",
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

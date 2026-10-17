import { css } from "hono/css";
import type { FC } from "hono/jsx";
import type { MediaItem } from "../../lib/media";
import { fileName } from "./string";

const figureClass = css`
  margin: 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
`;

const tileClass = css`
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: #ece7dc;
  cursor: pointer;
`;

const mediaClass = css`
  display: block;
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: #ece7dc;
`;

const captionClass = css`
  padding: 8px 10px 10px;
  font-size: 0.78rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MediaTile: FC<{
  item: MediaItem;
  onClick: () => void;
}> = ({ item, onClick }) => (
  <figure class={figureClass}>
    <button class={tileClass} type="button" onClick={onClick}>
      {item.kind === "video" ? (
        <video class={mediaClass} src={item.url} muted playsInline preload="metadata" />
      ) : (
        <img class={mediaClass} src={item.url} alt={fileName(item.key)} loading="lazy" />
      )}
    </button>
    <figcaption class={captionClass}>{fileName(item.key)}</figcaption>
  </figure>
);

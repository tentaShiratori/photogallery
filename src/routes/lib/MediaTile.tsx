import { css } from "hono/css";
import type { FC } from "hono/jsx";
import type { ThumbUrl } from "../../lib/name";

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
  thumbUrl: ThumbUrl;
  caption: string;
  onClick: () => void;
}> = ({ thumbUrl, caption, onClick }) => (
  <figure class={figureClass}>
    <button class={tileClass} type="button" onClick={onClick}>
      <img class={mediaClass} src={thumbUrl} alt={caption} loading="lazy" />
    </button>
    <figcaption class={captionClass}>{caption}</figcaption>
  </figure>
);

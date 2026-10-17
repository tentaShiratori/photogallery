import type { FC } from "hono/jsx";
import type { MediaItem } from "../../lib/media";
import { fileName } from "./string";

export const MediaTile: FC<{
  item: MediaItem;
  onClick: () => void;
}> = ({ item, onClick }) => (
  <figure>
    <button class="tile" type="button" onClick={onClick}>
      {item.kind === "video" ? (
        <video class="thumb" src={item.url} muted playsInline preload="metadata" />
      ) : (
        <img src={item.url} alt={fileName(item.key)} loading="lazy" />
      )}
    </button>
    <figcaption>{fileName(item.key)}</figcaption>
  </figure>
);

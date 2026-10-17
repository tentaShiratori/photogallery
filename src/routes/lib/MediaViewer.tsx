import { useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";
import type { MediaItem } from "../../lib/media";
import { fileName } from "./string";

export const MediaViewer: FC<{
  item: MediaItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  useEffect(() => {
    const dialog = document.getElementById("viewer") as HTMLDialogElement | null;
    if (item) {
      dialog?.showModal();
    } else {
      dialog?.close();
    }
  }, [item]);

  return (
    <dialog id="viewer">
      <button class="close" type="button" onClick={onClose}>
        閉じる
      </button>
      <div id="stage">
        {item &&
          (item.kind === "video" ? (
            <video src={item.url} controls autoplay />
          ) : (
            <img src={item.url} alt={fileName(item.key)} />
          ))}
      </div>
      <p id="caption">{item ? fileName(item.key) : ""}</p>
    </dialog>
  );
};

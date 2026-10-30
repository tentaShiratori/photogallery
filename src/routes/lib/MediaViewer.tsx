import { css } from "hono/css";
import { useEffect } from "hono/jsx";
import type { FC } from "hono/jsx";
import type { MediaKind } from "../../lib/kind";
import type { BodyUrl } from "../../lib/name";
import { markEnlarged } from "./enlarged/perf";

const dialogClass = css`
  width: min(960px, calc(100vw - 32px));
  border: 0;
  border-radius: 10px;
  padding: 12px;
  background: #111;
  color: #f4f1ea;
  &::backdrop {
    background: rgb(0 0 0 / 72%);
  }
`;

const dialogMediaClass = css`
  display: block;
  max-width: 100%;
  max-height: 78vh;
  margin: 0 auto;
`;

const dialogCaptionClass = css`
  margin: 10px 4px 4px;
  font-size: 0.85rem;
`;

const closeClass = css`
  float: right;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
`;

export const MediaViewer: FC<{
  item: { bodyUrl: BodyUrl; kind: MediaKind; caption: string } | null;
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

  useEffect(() => {
    if (!item || item.kind !== "image") return;
    const img = document.querySelector("#stage img");
    if (img instanceof HTMLImageElement && img.complete) markEnlarged.ready();
  }, [item]);

  useEffect(() => {
    const dialog = document.getElementById("viewer") as HTMLDialogElement | null;
    if (!dialog) return;
    const onDialogClose = () => onClose();
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [onClose]);

  return (
    <dialog class={dialogClass} id="viewer">
      <button class={closeClass} type="button" onClick={onClose}>
        閉じる
      </button>
      <div id="stage">
        {item &&
          (item.kind === "video" ? (
            <video class={dialogMediaClass} src={item.bodyUrl} controls autoplay />
          ) : (
            <img
              class={dialogMediaClass}
              src={item.bodyUrl}
              alt={item.caption}
              onLoad={() => markEnlarged.ready()}
              onError={() => markEnlarged.ready()}
            />
          ))}
      </div>
      <p class={dialogCaptionClass} id="caption">
        {item ? item.caption : ""}
      </p>
    </dialog>
  );
};

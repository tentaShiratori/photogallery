import type { MediaKind } from "../lib/kind";
import type { BodyUrl } from "../lib/name";
import { blankBrokenImage } from "./blank-image";
import { markEnlarged } from "./enlarged/perf";
import { FC, useEffect } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  dialog: {
    width: "min(960px, calc(100vw - 32px))",
    borderWidth: "0",
    borderStyle: "none",
    borderRadius: "10px",
    padding: "12px",
    backgroundColor: "#111",
    color: "#f4f1ea",
  },
  dialogMedia: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "78vh",
    margin: "0 auto",
  },
  dialogCaption: {
    margin: "10px 4px 4px",
    fontSize: "0.85rem",
  },
  close: {
    float: "right",
    borderWidth: "0",
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "inherit",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
});

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
    <dialog {...stylex.props(styles.dialog)} id="viewer">
      <button {...stylex.props(styles.close)} type="button" onClick={onClose}>
        閉じる
      </button>
      <div id="stage">
        {item &&
          (item.kind === "video" ? (
            <video {...stylex.props(styles.dialogMedia)} src={item.bodyUrl} controls autoPlay />
          ) : (
            <img
              {...stylex.props(styles.dialogMedia)}
              src={item.bodyUrl}
              alt={item.caption}
              onLoad={() => markEnlarged.ready()}
              onError={(event) => {
                blankBrokenImage(event);
                markEnlarged.ready();
              }}
            />
          ))}
      </div>
      <p {...stylex.props(styles.dialogCaption)} id="caption">
        {item ? item.caption : ""}
      </p>
    </dialog>
  );
};

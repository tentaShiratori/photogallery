/** 1×1 white PNG — same fill as e2e seed thumbs when the real asset fails. */
export const BLANK_IMAGE_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Swap a failed `<img>` for a blank tile so Chromium's broken-icon chrome stays out of screenshots. */
export function blankBrokenImage(event: { currentTarget: HTMLImageElement }): void {
  const img = event.currentTarget;
  if (img.src.startsWith("data:image/png;base64,")) return;
  img.onerror = null;
  img.src = BLANK_IMAGE_SRC;
}

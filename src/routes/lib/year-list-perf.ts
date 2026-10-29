export const YEAR_LIST_MARK_LOADING = "year-list-loading";
export const YEAR_LIST_MARK_API = "year-list-api";
export const YEAR_LIST_MARK_READY = "year-list-ready";

export function markYearList(name: string): void {
  performance.mark(name);
}

export function waitForYearListThumbs(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = document.getElementById("year-list");
        const images = root ? [...root.querySelectorAll("img")] : [];
        if (images.length === 0) {
          resolve();
          return;
        }
        let left = images.length;
        const done = () => {
          left -= 1;
          if (left <= 0) resolve();
        };
        for (const img of images) {
          if (img.complete) {
            done();
            continue;
          }
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      });
    });
  });
}

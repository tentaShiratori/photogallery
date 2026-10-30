export function waitForRootThumbs(rootId: string, limit?: number): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = document.getElementById(rootId);
        const all = root ? [...root.querySelectorAll("img")] : [];
        const images = limit === undefined ? all : all.slice(0, limit);
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

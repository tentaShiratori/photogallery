function isPaintedInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

function shouldWaitFor(img: HTMLImageElement): boolean {
  return img.complete || img.currentSrc.length > 0 || isPaintedInViewport(img);
}

export function waitForRootThumbs(rootId: string, limit?: number): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = document.getElementById(rootId);
        const all = root ? [...root.querySelectorAll("img")] : [];
        const limited = limit === undefined ? all : all.slice(0, limit);
        const images = limited.filter(shouldWaitFor);
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

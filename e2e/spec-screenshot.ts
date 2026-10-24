import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Browser } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { updateSpecScreenshots } from "./update-spec.ts";
import { BREAKPOINT_PX } from "./viewports.ts";

export type SpecUc = "UC-01" | "UC-02";

/** Tolerance for font and antialias noise across Linux runners. */
const SCREENSHOT_OPTIONS = {
  threshold: 0.2,
  maxDiffPixelRatio: 0.01,
} as const;

function targetFromWidth(width: number): "pc" | "mobile" {
  return width > BREAKPOINT_PX ? "pc" : "mobile";
}

async function waitForPaint(browser: Browser): Promise<void> {
  await browser.evaluate(async () => {
    await document.fonts.ready;
    // Lazy tiles off-screen never fire load; wait only for what the viewport shows.
    const visible = [...document.images].filter((img) => {
      const box = img.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight;
    });
    await Promise.all(
      visible.map(
        (img) =>
          new Promise<boolean>((resolve) => {
            if (img.complete) {
              resolve(true);
              return;
            }
            img.addEventListener("load", () => resolve(true), { once: true });
            img.addEventListener("error", () => resolve(true), { once: true });
          }),
      ),
    );
    return true;
  });
}

/**
 * Compare the viewport with a committed baseline beside the test file, then
 * keep `docs/spec/screenshots/<UC>/<name>-<pc|mobile>.png` in sync for UC docs.
 * Pixel compare always runs. Docs copy when `PHOTOGALLERY_UPDATE_SPEC=1`
 * (`pnpm e2e:update-screenshots`).
 */
export async function expectUcScreenshot(
  screen: Screen,
  browser: Browser,
  opts: { uc: SpecUc; name: string; testFile: string },
): Promise<void> {
  const update = updateSpecScreenshots();

  await waitForPaint(browser);
  const shotName = `${opts.uc}-${opts.name}.png`;
  await expect(screen).toHaveScreenshot(shotName, SCREENSHOT_OPTIONS);
  const width = await browser.evaluate(() => window.innerWidth);
  const target = targetFromWidth(width);
  const snapshotRel = path.join(
    `${opts.testFile}-snapshots`,
    `${opts.uc}-${opts.name}-${target}-${process.platform}.png`,
  );
  const docsRel = path.join("docs/spec/screenshots", opts.uc, `${opts.name}-${target}.png`);
  const snapshotAbs = path.resolve(snapshotRel);
  const docsAbs = path.resolve(docsRel);

  if (!existsSync(snapshotAbs)) {
    throw new Error(`missing e2e snapshot ${snapshotRel}`);
  }

  if (update) {
    mkdirSync(path.dirname(docsAbs), { recursive: true });
    copyFileSync(snapshotAbs, docsAbs);
  }

  if (!existsSync(docsAbs)) {
    throw new Error(`missing ${docsRel}; run pnpm e2e:update-screenshots`);
  }

  const snapshotBytes = readFileSync(snapshotAbs);
  const docsBytes = readFileSync(docsAbs);
  if (!snapshotBytes.equals(docsBytes)) {
    throw new Error(`${docsRel} differs from ${snapshotRel}; run pnpm e2e:update-screenshots`);
  }
}

import { STEP } from "../feed";
import { waitForRootThumbs } from "../wait-thumbs";

const YEAR_SCREEN_MARK_LOADING = "year-screen-loading";
const YEAR_SCREEN_MARK_API = "year-screen-api";
const YEAR_SCREEN_MARK_READY = "year-screen-ready";

export const markYearScreen = {
  loading(): void {
    performance.mark(YEAR_SCREEN_MARK_LOADING);
  },
  api(): void {
    performance.mark(YEAR_SCREEN_MARK_API);
  },
  ready(): void {
    performance.mark(YEAR_SCREEN_MARK_READY);
  },
};

export function waitForYearScreenThumbs(): Promise<void> {
  return waitForRootThumbs("grid", STEP);
}

import { waitForRootThumbs } from "../wait-thumbs";

const YEAR_LIST_MARK_LOADING = "year-list-loading";
const YEAR_LIST_MARK_API = "year-list-api";
const YEAR_LIST_MARK_READY = "year-list-ready";

export const markYearList = {
  loading(): void {
    performance.mark(YEAR_LIST_MARK_LOADING);
  },
  api(): void {
    performance.mark(YEAR_LIST_MARK_API);
  },
  ready(): void {
    performance.mark(YEAR_LIST_MARK_READY);
  },
};

export function waitForYearListThumbs(): Promise<void> {
  return waitForRootThumbs("year-list");
}

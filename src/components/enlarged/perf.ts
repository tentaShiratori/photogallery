const ENLARGED_MARK_OPEN = "enlarged-open";
const ENLARGED_MARK_READY = "enlarged-ready";

export const markEnlarged = {
  open(): void {
    performance.mark(ENLARGED_MARK_OPEN);
  },
  ready(): void {
    performance.mark(ENLARGED_MARK_READY);
  },
};

import type { BodyUrl, ThumbUrl } from "../../lib/name/types.ts";
import type { ParsedMedia, ParsedYearCard } from "./feed";

export function mediaItem(label: string, index: number, kind: "image" | "video" = "image"): ParsedMedia {
  return {
    bodyKey: `${label}-${index}.jpg`,
    kind,
    bodyUrl: `/media/${label}-${index}.jpg` as BodyUrl,
    thumbUrl: `/media/t/${label}-${index}.webp` as ThumbUrl,
    caption: `${label}-${index}.jpg`,
  };
}

export function yearCard(label: string, previewCount: number): ParsedYearCard {
  return {
    label,
    previews: Array.from({ length: previewCount }, (_, i) => mediaItem(label, i)),
  };
}

import * as v from "valibot";
import type { BodyUrl, ThumbUrl } from "./name/types.ts";

const mediaItemSchema = v.object({
  bodyKey: v.pipe(v.string(), v.nonEmpty()),
  kind: v.picklist(["image", "video"]),
  bodyUrl: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.transform((value): BodyUrl => value as BodyUrl),
  ),
  thumbUrl: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.transform((value): ThumbUrl => value as ThumbUrl),
  ),
  caption: v.pipe(v.string(), v.nonEmpty()),
});

export type MediaItem = v.InferOutput<typeof mediaItemSchema>;

const yearGroupSchema = v.object({
  label: v.string(),
  truncated: v.boolean(),
  items: v.pipe(
    v.array(mediaItemSchema),
    v.minLength(1),
    v.transform((items): readonly [MediaItem, ...MediaItem[]] => {
      const [first, ...rest] = items;
      if (first === undefined) throw new Error("items");
      return [first, ...rest];
    }),
  ),
});

const yearCardSchema = v.object({
  label: v.string(),
  previews: v.pipe(v.array(mediaItemSchema), v.maxLength(4)),
});

const yearListResponseSchema = v.object({
  years: v.array(yearCardSchema),
});

const yearScreenResponseSchema = v.object({
  group: v.nullable(yearGroupSchema),
  next: v.null(),
});

/** Derived from `yearListResponseSchema`, with readonly fields for server assignability. */
export type YearListResponse = {
  readonly years: ReadonlyArray<{
    readonly label: string;
    readonly previews: ReadonlyArray<MediaItem>;
  }>;
};

/** Derived from `yearScreenResponseSchema`, with readonly fields for server assignability. */
export type YearScreenResponse = {
  readonly group: {
    readonly label: string;
    readonly truncated: boolean;
    readonly items: readonly [MediaItem, ...MediaItem[]];
  } | null;
  readonly next: null;
};

export type YearGroupResponse = NonNullable<YearScreenResponse["group"]>;
export type YearCardResponse = YearListResponse["years"][number];

const SHAPE_ERROR = "一覧の形が違います。";

export function parseYearListResponse(input: unknown): YearListResponse {
  const result = v.safeParse(yearListResponseSchema, input);
  if (!result.success) throw new Error(SHAPE_ERROR);
  return result.output;
}

export function parseYearScreenResponse(input: unknown): YearScreenResponse {
  const result = v.safeParse(yearScreenResponseSchema, input);
  if (!result.success) throw new Error(SHAPE_ERROR);
  return result.output;
}

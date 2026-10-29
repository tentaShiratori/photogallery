import type { MediaKind } from "../media.ts";

declare const stemBrand: unique symbol;
declare const bodyKeyBrand: unique symbol;
declare const thumbKeyBrand: unique symbol;
declare const bodyUrlBrand: unique symbol;
declare const thumbUrlBrand: unique symbol;

export const mediaSeal: unique symbol = Symbol("Media");

export type Stem = string & { readonly [stemBrand]: "Stem" };
export type BodyKey = string & { readonly [bodyKeyBrand]: "BodyKey" };
export type ThumbKey = string & { readonly [thumbKeyBrand]: "ThumbKey" };
export type BodyUrl = string & { readonly [bodyUrlBrand]: "BodyUrl" };
export type ThumbUrl = string & { readonly [thumbUrlBrand]: "ThumbUrl" };

export type Media = {
  readonly [mediaSeal]: "Media";
  readonly bodyKey: BodyKey;
  readonly kind: MediaKind;
  readonly bodyUrl: BodyUrl;
  readonly thumbUrl: ThumbUrl;
  readonly caption: string;
};

declare const yearBrand: unique symbol;

/** A capture year in 1..9999. The label is `String(year)`; the key prefix pads it to 4 digits. */
export type Year = number & { readonly [yearBrand]: "Year" };

export type YearGroup = {
  readonly label: string;
  /** Some object under this heading's prefixes was not read because of the object budget. */
  readonly truncated: boolean;
  readonly items: readonly [Media, ...Media[]];
};

/**
 * One step of the walk. A null `group` means this step had no pairs, not the end.
 * `next` is the `after` for the following step; null ends the walk.
 */
export type ListingPage = {
  readonly group: YearGroup | null;
  readonly next: Year | null;
};

export type Lister = {
  list(options: Pick<R2ListOptions, "prefix" | "delimiter" | "cursor" | "limit">): Promise<
    {
      readonly objects: readonly Pick<R2Object, "key" | "size" | "uploaded">[];
      readonly delimitedPrefixes: readonly string[];
    } & ({ readonly truncated: true; readonly cursor: string } | { readonly truncated: false })
  >;
};

export type UploadPlan = {
  readonly bodyKey: BodyKey;
  readonly thumbKey: ThumbKey;
  readonly kind: MediaKind;
  readonly bodyContentType: string;
};

export type PlannedFile = {
  readonly name: string;
  readonly filePath: string;
  readonly plan: UploadPlan;
};

export type ThumbnailFile = {
  readonly bytes: Uint8Array;
  readonly contentType: "image/webp";
};

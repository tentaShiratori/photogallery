import type { MediaKind } from "../kind.ts";

declare const stemBrand: unique symbol;
declare const bodyKeyBrand: unique symbol;
declare const thumbKeyBrand: unique symbol;
declare const bodyUrlBrand: unique symbol;
declare const thumbUrlBrand: unique symbol;

export type Stem = string & { readonly [stemBrand]: "Stem" };
export type BodyKey = string & { readonly [bodyKeyBrand]: "BodyKey" };
export type ThumbKey = string & { readonly [thumbKeyBrand]: "ThumbKey" };
export type BodyUrl = string & { readonly [bodyUrlBrand]: "BodyUrl" };
export type ThumbUrl = string & { readonly [thumbUrlBrand]: "ThumbUrl" };

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

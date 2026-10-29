import { extensionOf, type ImageExtension, type VideoExtension } from "../media.ts";
import { instantFromBmffExif } from "./bmff.ts";
import { type RangeRead } from "./bytes.ts";
import { civilFromParts, type CaptureInstant, type CivilCapture } from "./civil.ts";
import { instantFromJpeg, instantFromPng, instantFromWebp } from "./image.ts";
import { instantFromBmffCreate } from "./video.ts";

export type { CivilCapture };
export { civilFromParts };

type CaptureMethod = "jpeg-exif" | "png-exif" | "webp-exif" | "bmff-exif" | "bmff-create" | "none";

const CAPTURE_METHOD = {
  jpg: "jpeg-exif",
  jpeg: "jpeg-exif",
  png: "png-exif",
  gif: "none",
  webp: "webp-exif",
  avif: "bmff-exif",
  heic: "bmff-exif",
  heif: "bmff-exif",
  mp4: "bmff-create",
  mov: "bmff-create",
  m4v: "bmff-create",
  webm: "none",
} as const satisfies Record<ImageExtension | VideoExtension, CaptureMethod>;

function methodFor(name: string): CaptureMethod {
  const extension = extensionOf(name);
  if (extension in CAPTURE_METHOD) return CAPTURE_METHOD[extension as keyof typeof CAPTURE_METHOD];
  return "none";
}

async function captureOf(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  try {
    switch (methodFor(key)) {
      case "none":
        return null;
      case "jpeg-exif":
        return await instantFromJpeg(key, size, read);
      case "png-exif":
        return await instantFromPng(key, size, read);
      case "webp-exif":
        return await instantFromWebp(key, size, read);
      case "bmff-exif":
        return await instantFromBmffExif(key, size, read);
      case "bmff-create":
        return await instantFromBmffCreate(key, size, read);
    }
  } catch {
    console.error(key);
    return null;
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function captureFromMtime(mtime: Date, now: Date): CivilCapture | null {
  if (now.getTime() - mtime.getTime() <= WEEK_MS) return null;
  return civilFromParts(
    mtime.getFullYear(),
    mtime.getMonth() + 1,
    mtime.getDate(),
    mtime.getHours(),
    mtime.getMinutes(),
    mtime.getSeconds(),
  );
}

export async function embeddedCapture(
  name: string,
  size: number,
  read: RangeRead,
): Promise<CivilCapture | null> {
  const instant = await captureOf(name, size, read);
  return instant ? instant.toCivil() : null;
}

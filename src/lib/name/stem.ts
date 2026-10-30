import { civilFromParts, type CivilCapture } from "../capture/index.ts";
import { contentTypeForName, kindForName, mediaPath, type MediaKind } from "../kind.ts";
import type { BodyKey, BodyUrl, Stem, ThumbKey, ThumbUrl, UploadPlan } from "./types.ts";

const DATED_STEM = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-([1-9]\d*))?$/;
const UNKNOWN_STEM = /^u-([0-9a-f]{12})(?:-([1-9]\d*))?$/;

type Classified =
  | { readonly stem: Stem; readonly role: "body"; readonly bodyKey: BodyKey }
  | { readonly stem: Stem; readonly role: "thumb"; readonly thumbKey: ThumbKey };

function suffixOk(raw: string | undefined): boolean {
  if (raw === undefined) return true;
  return Number(raw) >= 2;
}

function isStem(value: string): value is Stem {
  const dated = DATED_STEM.exec(value);
  if (dated) {
    if (!suffixOk(dated[7])) return false;
    return (
      civilFromParts(
        Number(dated[1]),
        Number(dated[2]),
        Number(dated[3]),
        Number(dated[4]),
        Number(dated[5]),
        Number(dated[6]),
      ) !== null
    );
  }
  const unknown = UNKNOWN_STEM.exec(value);
  if (!unknown || !suffixOk(unknown[2])) return false;
  return true;
}

function isBodyKey(value: string): value is BodyKey {
  if (value.length === 0 || value.includes("/")) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;
  if (kindForName(value) === null) return false;
  return isStem(value.slice(0, dot));
}

function isThumbKey(value: string): value is ThumbKey {
  if (!value.startsWith("t/") || !value.endsWith(".webp")) return false;
  const stem = value.slice(2, -".webp".length);
  if (stem.length === 0 || stem.includes("/")) return false;
  return isStem(stem);
}

function isBodyUrl(value: string): value is BodyUrl {
  return value.startsWith("/media/") && !value.slice("/media/".length).includes("/");
}

function isThumbUrl(value: string): value is ThumbUrl {
  const prefix = "/media/t/";
  if (!value.startsWith(prefix) || !value.endsWith(".webp")) return false;
  const stem = value.slice(prefix.length, -".webp".length);
  return stem.length > 0 && !stem.includes("/");
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function formatCivil(capture: CivilCapture): string {
  return `${pad(capture.year, 4)}-${pad(capture.month, 2)}-${pad(capture.day, 2)}T${pad(capture.hour, 2)}-${pad(capture.minute, 2)}-${pad(capture.second, 2)}`;
}

export function thumbKeyFor(bodyKey: BodyKey): ThumbKey {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  const key = `t/${stem}.webp`;
  if (isThumbKey(key)) return key;
  throw new Error(`サムネイルキーを作れません: ${bodyKey}`);
}

export function urlForBody(bodyKey: BodyKey): BodyUrl {
  const url = mediaPath(bodyKey);
  if (isBodyUrl(url)) return url;
  throw new Error(`本体 URL を作れません: ${bodyKey}`);
}

export function urlForThumb(thumbKey: ThumbKey): ThumbUrl {
  const url = mediaPath(thumbKey);
  if (isThumbUrl(url)) return url;
  throw new Error(`サムネイル URL を作れません: ${thumbKey}`);
}

export function kindOfBody(bodyKey: BodyKey): MediaKind {
  const kind = kindForName(bodyKey);
  if (kind === "image" || kind === "video") return kind;
  throw new Error(`種類がありません: ${bodyKey}`);
}

export class StemClaim {
  private readonly taken = new Set<string>();

  plan(capture: CivilCapture | null, extension: string, unknownId: string): UploadPlan {
    const ext = extension.toLowerCase();
    const base = capture ? formatCivil(capture) : `u-${unknownId}`;
    const stem = this.claim(base);
    const key = `${stem}.${ext}`;
    if (!isBodyKey(key)) throw new Error(`本体キーを作れません: ${key}`);
    return {
      bodyKey: key,
      thumbKey: thumbKeyFor(key),
      kind: kindOfBody(key),
      bodyContentType: contentTypeForName(key),
    };
  }

  private claim(base: string): Stem {
    let stem = base;
    if (this.taken.has(stem)) {
      let suffix = 2;
      while (this.taken.has(`${base}-${suffix}`)) suffix += 1;
      stem = `${base}-${suffix}`;
    }
    this.taken.add(stem);
    if (isStem(stem)) return stem;
    throw new Error(`ステムを作れません: ${stem}`);
  }
}

export function captureFromKey(bodyKey: BodyKey): CivilCapture | null {
  const stem = bodyKey.slice(0, bodyKey.lastIndexOf("."));
  const dated = DATED_STEM.exec(stem);
  if (!dated) return null;
  return civilFromParts(
    Number(dated[1]),
    Number(dated[2]),
    Number(dated[3]),
    Number(dated[4]),
    Number(dated[5]),
    Number(dated[6]),
  );
}

export function classify(key: string): Classified | null {
  if (isThumbKey(key)) {
    const stem = key.slice(2, -".webp".length);
    if (!isStem(stem)) return null;
    return { stem, role: "thumb", thumbKey: key };
  }
  if (isBodyKey(key)) {
    const stem = key.slice(0, key.lastIndexOf("."));
    if (!isStem(stem)) return null;
    return { stem, role: "body", bodyKey: key };
  }
  return null;
}

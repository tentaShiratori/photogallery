export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif"] as const;

export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v"] as const;

export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];
export type VideoExtension = (typeof VIDEO_EXTENSIONS)[number];
export type MediaKind = "image" | "video";

const IMAGE_EXTENSION_SET = new Set<string>(IMAGE_EXTENSIONS);
const VIDEO_EXTENSION_SET = new Set<string>(VIDEO_EXTENSIONS);

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
} as const satisfies Record<ImageExtension | VideoExtension, string>;

export function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function kindForName(name: string): MediaKind | null {
  const extension = extensionOf(name);
  if (IMAGE_EXTENSION_SET.has(extension)) return "image";
  if (VIDEO_EXTENSION_SET.has(extension)) return "video";
  return null;
}

export function contentTypeForName(name: string): string {
  const extension = extensionOf(name);
  if (extension in CONTENT_TYPES) return CONTENT_TYPES[extension as ImageExtension | VideoExtension];
  return "application/octet-stream";
}

export function selectUploadNames(names: string[]): string[] {
  return names.filter((name) => {
    const base = name.split(/[/\\]/).pop() ?? name;
    if (base.startsWith(".")) return false;
    return kindForName(base) !== null;
  });
}

export function mediaPath(key: string): string {
  const encoded = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/media/${encoded}`;
}

export function keyFromMediaPath(pathname: string): string | null {
  const prefix = "/media/";
  if (!pathname.startsWith(prefix)) return null;
  const raw = pathname.slice(prefix.length);
  if (raw === "") return null;
  let key: string;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (key === "" || key.startsWith("/") || key.includes("\\")) return null;
  if (key.split("/").includes("..") || key.split("/").includes("")) return null;
  return key;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function contentRangeHeader(offset: number, length: number, size: number): string {
  const end = offset + length - 1;
  return `bytes ${offset}-${end}/${size}`;
}

export function byteContentRange(
  range: { offset?: number; length?: number; suffix?: number },
  size: number,
): string | null {
  if (typeof range.suffix === "number" && range.offset === undefined) {
    const length = Math.min(range.suffix, size);
    return contentRangeHeader(size - length, length, size);
  }
  if (typeof range.offset !== "number") return null;
  const length = typeof range.length === "number" ? range.length : size - range.offset;
  if (length < 0) return null;
  return contentRangeHeader(range.offset, length, size);
}

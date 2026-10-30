import { EXIF_CAP, MAX_CHUNK_STEPS, type RangeRead, fourcc, take, takeUpTo, u16, u32, u32be } from "./bytes.ts";
import { CaptureInstant } from "./civil.ts";

function civilFromExifText(text: string): CaptureInstant | null {
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  return CaptureInstant.tryCreate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
}

type IfdEntry = {
  readonly type: number;
  readonly count: number;
  readonly value: number;
  readonly inline: Uint8Array;
};

function findEntry(bytes: Uint8Array, ifdOffset: number, tag: number, little: boolean): IfdEntry | null {
  const count = u16(bytes, ifdOffset, little);
  if (count === null || count > 256) return null;
  if (ifdOffset + 2 + count * 12 > bytes.length) return null;
  for (let index = 0; index < count; index++) {
    const at = ifdOffset + 2 + index * 12;
    const entryTag = u16(bytes, at, little);
    if (entryTag !== tag) continue;
    const type = u16(bytes, at + 2, little);
    const entryCount = u32(bytes, at + 4, little);
    const value = u32(bytes, at + 8, little);
    if (type === null || entryCount === null || value === null) return null;
    return { type, count: entryCount, value, inline: bytes.subarray(at + 8, at + 12) };
  }
  return null;
}

function asciiTag(bytes: Uint8Array, ifdOffset: number, tag: number, little: boolean): string | null {
  const entry = findEntry(bytes, ifdOffset, tag, little);
  if (!entry || entry.type !== 2 || entry.count <= 0 || entry.count > 64) return null;
  const raw =
    entry.count <= 4
      ? entry.inline.subarray(0, entry.count)
      : entry.value + entry.count <= bytes.length
        ? bytes.subarray(entry.value, entry.value + entry.count)
        : null;
  if (!raw) return null;
  let text = "";
  for (const byte of raw) {
    if (byte === 0) break;
    text += String.fromCharCode(byte);
  }
  return text;
}

export function dateTimeOriginalFromTiff(bytes: Uint8Array): CaptureInstant | null {
  if (bytes.length < 8) return null;
  const little = bytes[0] === 0x49 && bytes[1] === 0x49 ? true : bytes[0] === 0x4d && bytes[1] === 0x4d ? false : null;
  if (little === null) return null;
  if (u16(bytes, 2, little) !== 42) return null;
  const ifd0 = u32(bytes, 4, little);
  if (ifd0 === null) return null;
  const exif = findEntry(bytes, ifd0, 0x8769, little);
  if (!exif || exif.type !== 4 || exif.count !== 1) return null;
  const text = asciiTag(bytes, exif.value, 0x9003, little);
  if (text === null) return null;
  return civilFromExifText(text);
}

function exifApp1(payload: Uint8Array): CaptureInstant | null {
  if (
    payload.length < 8 ||
    payload[0] !== 0x45 ||
    payload[1] !== 0x78 ||
    payload[2] !== 0x69 ||
    payload[3] !== 0x66 ||
    payload[4] !== 0 ||
    payload[5] !== 0
  ) {
    return null;
  }
  return dateTimeOriginalFromTiff(payload.subarray(6));
}

export async function instantFromJpeg(key: string, size: number, read: RangeRead): Promise<CaptureInstant | null> {
  const soi = await take(read, key, 0, 2);
  if (!soi || soi[0] !== 0xff || soi[1] !== 0xd8) return null;
  let pos = 2;
  for (let step = 0; step < MAX_CHUNK_STEPS && pos + 2 <= size; step++) {
    const mark = await takeUpTo(read, key, pos, Math.min(4, size - pos));
    if (mark.length < 2 || mark[0] !== 0xff) return null;
    let index = 1;
    while (index < mark.length && mark[index] === 0xff) index += 1;
    if (index >= mark.length) {
      pos += mark.length;
      continue;
    }
    const marker = mark[index]!;
    const afterMarker = pos + index + 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      pos = afterMarker;
      continue;
    }
    const lengthBytes = await take(read, key, afterMarker, 2);
    if (!lengthBytes) return null;
    const segLen = (lengthBytes[0]! << 8) | lengthBytes[1]!;
    if (segLen < 2) return null;
    const payloadLen = segLen - 2;
    if (marker === 0xe1 && payloadLen >= 6) {
      const payload = await takeUpTo(read, key, afterMarker + 2, Math.min(payloadLen, EXIF_CAP));
      const instant = exifApp1(payload);
      if (instant) return instant;
    }
    const next = afterMarker + segLen;
    if (next <= pos || next > size) return null;
    pos = next;
  }
  return null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function instantFromPng(key: string, size: number, read: RangeRead): Promise<CaptureInstant | null> {
  const signature = await take(read, key, 0, 8);
  if (!signature || PNG_SIGNATURE.some((byte, index) => signature[index] !== byte)) return null;
  let pos = 8;
  for (let step = 0; step < MAX_CHUNK_STEPS && pos + 8 <= size; step++) {
    const head = await take(read, key, pos, 8);
    if (!head) return null;
    const length = u32be(head, 0);
    const type = fourcc(head, 4);
    if (length === null || type === null) return null;
    if (type === "eXIf") {
      const data = await takeUpTo(read, key, pos + 8, Math.min(length, EXIF_CAP));
      return dateTimeOriginalFromTiff(data);
    }
    if (type === "IEND") return null;
    const next = pos + 12 + length;
    if (next <= pos || next > size) return null;
    pos = next;
  }
  return null;
}

export async function instantFromWebp(key: string, size: number, read: RangeRead): Promise<CaptureInstant | null> {
  const head = await take(read, key, 0, 12);
  if (!head || fourcc(head, 0) !== "RIFF" || fourcc(head, 8) !== "WEBP") return null;
  let pos = 12;
  for (let step = 0; step < MAX_CHUNK_STEPS && pos + 8 <= size; step++) {
    const chunk = await take(read, key, pos, 8);
    if (!chunk) return null;
    const type = fourcc(chunk, 0);
    const length = u32(chunk, 4, true);
    if (type === null || length === null) return null;
    if (type === "EXIF") {
      const data = await takeUpTo(read, key, pos + 8, Math.min(length, EXIF_CAP));
      return dateTimeOriginalFromTiff(data);
    }
    const next = pos + 8 + length + (length & 1);
    if (next <= pos || next > size) return null;
    pos = next;
  }
  return null;
}

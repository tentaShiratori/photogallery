import { extensionOf, type ImageExtension, type VideoExtension } from "./media.ts";

export type CivilCapture = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

type RangeRead = (key: string, offset: number, length: number) => Promise<Uint8Array>;

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

const MAX_BOX_STEPS = 64;
const MAX_CHUNK_STEPS = 64;
const EXIF_CAP = 256 * 1024;
const META_CAP = 1024 * 1024;
const MAC_EPOCH_MS = BigInt(Date.UTC(1904, 0, 1));

class CaptureInstant {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;

  private constructor(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

  static tryCreate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ): CaptureInstant | null {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(second)
    ) {
      return null;
    }
    if (year < 1 || year > 9999) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;
    if (second < 0 || second > 60) return null;
    return new CaptureInstant(year, month, day, hour, minute, second);
  }

  toCivil(): CivilCapture {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
    };
  }
}

export function civilFromParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): CivilCapture | null {
  const instant = CaptureInstant.tryCreate(year, month, day, hour, minute, second);
  return instant ? instant.toCivil() : null;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  const days = [0, 31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month] ?? 0;
}

function methodFor(name: string): CaptureMethod {
  const extension = extensionOf(name);
  if (extension in CAPTURE_METHOD) return CAPTURE_METHOD[extension as keyof typeof CAPTURE_METHOD];
  return "none";
}

function u16(bytes: Uint8Array, offset: number, little: boolean): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, little);
}

function u32(bytes: Uint8Array, offset: number, little: boolean): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, little);
}

function u64(bytes: Uint8Array, offset: number, little: boolean): bigint | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, little);
}

function u16be(bytes: Uint8Array, offset: number): number | null {
  return u16(bytes, offset, false);
}

function u32be(bytes: Uint8Array, offset: number): number | null {
  return u32(bytes, offset, false);
}

function fourcc(bytes: Uint8Array, offset: number): string | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

async function takeUpTo(
  read: RangeRead,
  key: string,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  if (length <= 0 || offset < 0) return new Uint8Array();
  return read(key, offset, length);
}

async function take(
  read: RangeRead,
  key: string,
  offset: number,
  length: number,
): Promise<Uint8Array | null> {
  const bytes = await takeUpTo(read, key, offset, length);
  if (bytes.length !== length) return null;
  return bytes;
}

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

function findEntry(
  bytes: Uint8Array,
  ifdOffset: number,
  tag: number,
  little: boolean,
): IfdEntry | null {
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

function asciiTag(
  bytes: Uint8Array,
  ifdOffset: number,
  tag: number,
  little: boolean,
): string | null {
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

function dateTimeOriginalFromTiff(bytes: Uint8Array): CaptureInstant | null {
  if (bytes.length < 8) return null;
  const little =
    bytes[0] === 0x49 && bytes[1] === 0x49
      ? true
      : bytes[0] === 0x4d && bytes[1] === 0x4d
        ? false
        : null;
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

async function instantFromJpeg(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
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

async function instantFromPng(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
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

async function instantFromWebp(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
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

type Box = {
  readonly type: string;
  readonly size: number;
  readonly headerSize: number;
  readonly payloadOffset: number;
};

async function readBox(
  key: string,
  offset: number,
  fileSize: number,
  read: RangeRead,
): Promise<Box | null> {
  if (offset < 0 || offset + 8 > fileSize) return null;
  const head = await take(read, key, offset, 8);
  if (!head) return null;
  const size32 = u32be(head, 0);
  const type = fourcc(head, 4);
  if (size32 === null || type === null) return null;
  if (size32 === 1) {
    const extended = await take(read, key, offset + 8, 8);
    if (!extended) return null;
    const wide = u64(extended, 0, false);
    if (wide === null || wide < 16n || wide > BigInt(fileSize - offset)) return null;
    const size = Number(wide);
    return { type, size, headerSize: 16, payloadOffset: offset + 16 };
  }
  if (size32 === 0) {
    const size = fileSize - offset;
    if (size < 8) return null;
    return { type, size, headerSize: 8, payloadOffset: offset + 8 };
  }
  if (size32 < 8 || offset + size32 > fileSize) return null;
  return { type, size: size32, headerSize: 8, payloadOffset: offset + 8 };
}

type SliceBox = {
  readonly type: string;
  readonly start: number;
  readonly end: number;
};

function boxesIn(bytes: Uint8Array, from: number, to: number): SliceBox[] {
  const boxes: SliceBox[] = [];
  let offset = from;
  for (let step = 0; step < MAX_BOX_STEPS && offset + 8 <= to; step++) {
    const size32 = u32be(bytes, offset);
    const type = fourcc(bytes, offset + 4);
    if (size32 === null || type === null) break;
    let header = 8;
    let boxSize = size32;
    if (size32 === 1) {
      const wide = u64(bytes, offset + 8, false);
      if (wide === null || wide > BigInt(Number.MAX_SAFE_INTEGER)) break;
      boxSize = Number(wide);
      header = 16;
    } else if (size32 === 0) {
      boxSize = to - offset;
    }
    if (boxSize < header || offset + boxSize > to) break;
    boxes.push({ type, start: offset + header, end: offset + boxSize });
    offset += boxSize;
  }
  return boxes;
}

function infeExifId(payload: Uint8Array): number | null {
  if (payload.length < 12) return null;
  const version = payload[0];
  if (version !== 2 && version !== 3) return null;
  const id = version === 2 ? u16be(payload, 4) : u32be(payload, 4);
  const typeAt = version === 2 ? 8 : 10;
  if (id === null || fourcc(payload, typeAt) !== "Exif") return null;
  return id;
}

function exifItemId(payload: Uint8Array): number | null {
  if (payload.length < 6) return null;
  const version = payload[0]!;
  const count = version === 0 ? u16be(payload, 4) : u32be(payload, 4);
  if (count === null) return null;
  const entries = boxesIn(payload, version === 0 ? 6 : 8, payload.length);
  for (const entry of entries) {
    if (entry.type !== "infe") continue;
    const id = infeExifId(payload.subarray(entry.start, entry.end));
    if (id !== null) return id;
  }
  return null;
}

function sizedInt(bytes: Uint8Array, offset: number, size: number): bigint | null {
  if (size === 0) return 0n;
  if (size === 4) {
    const value = u32be(bytes, offset);
    return value === null ? null : BigInt(value);
  }
  if (size === 8) return u64(bytes, offset, false);
  return null;
}

function itemExtent(
  payload: Uint8Array,
  itemId: number,
): { method: number; offset: number; length: number } | null {
  if (payload.length < 6) return null;
  const version = payload[0]!;
  if (version > 2) return null;
  const offsetSize = payload[4]! >> 4;
  const lengthSize = payload[4]! & 0x0f;
  const baseSize = payload[5]! >> 4;
  const indexSize = version === 0 ? 0 : payload[5]! & 0x0f;
  let pos = 6;
  const itemCount = version < 2 ? u16be(payload, pos) : u32be(payload, pos);
  if (itemCount === null || itemCount > 4096) return null;
  pos += version < 2 ? 2 : 4;
  for (let index = 0; index < itemCount; index++) {
    const id = version < 2 ? u16be(payload, pos) : u32be(payload, pos);
    if (id === null) return null;
    pos += version < 2 ? 2 : 4;
    let method = 0;
    if (version === 1 || version === 2) {
      const raw = u16be(payload, pos);
      if (raw === null) return null;
      method = raw & 0x0f;
      pos += 2;
    }
    if (u16be(payload, pos) === null) return null;
    pos += 2;
    const base = sizedInt(payload, pos, baseSize);
    if (base === null) return null;
    pos += baseSize;
    const extentCount = u16be(payload, pos);
    if (extentCount === null) return null;
    pos += 2;
    let first: { offset: bigint; length: bigint } | null = null;
    for (let extent = 0; extent < extentCount; extent++) {
      if (indexSize > 0) pos += indexSize;
      const extentOffset = sizedInt(payload, pos, offsetSize);
      if (extentOffset === null) return null;
      pos += offsetSize;
      const extentLength = sizedInt(payload, pos, lengthSize);
      if (extentLength === null) return null;
      pos += lengthSize;
      if (extent === 0) first = { offset: extentOffset, length: extentLength };
    }
    if (id === itemId && first) {
      const fileOffset = base + first.offset;
      if (
        fileOffset > BigInt(Number.MAX_SAFE_INTEGER) ||
        first.length > BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        return null;
      }
      return { method, offset: Number(fileOffset), length: Number(first.length) };
    }
  }
  return null;
}

async function exifFromMeta(
  key: string,
  meta: Uint8Array,
  fileSize: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  if (meta.length < 4) return null;
  const children = boxesIn(meta, 4, meta.length);
  const iinf = children.find((box) => box.type === "iinf");
  const iloc = children.find((box) => box.type === "iloc");
  if (!iinf || !iloc) return null;
  const itemId = exifItemId(meta.subarray(iinf.start, iinf.end));
  if (itemId === null) return null;
  const location = itemExtent(meta.subarray(iloc.start, iloc.end), itemId);
  if (!location || location.method !== 0) return null;
  const extentLength = location.length === 0 ? fileSize - location.offset : location.length;
  if (location.offset < 0 || location.offset >= fileSize || extentLength <= 0) return null;
  const ask = Math.min(extentLength, EXIF_CAP, fileSize - location.offset);
  const extent = await takeUpTo(read, key, location.offset, ask);
  if (extent.length < 4) return null;
  // The uint32 counts from the item start, so the TIFF header can sit after padding.
  const tiffAt = u32be(extent, 0);
  if (tiffAt === null || tiffAt >= extent.length) return null;
  return dateTimeOriginalFromTiff(extent.subarray(tiffAt));
}

async function instantFromBmffExif(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  let offset = 0;
  for (let step = 0; step < MAX_BOX_STEPS && offset + 8 <= size; step++) {
    const box = await readBox(key, offset, size, read);
    if (!box) return null;
    if (box.type === "meta") {
      const payloadLength = box.size - box.headerSize;
      const meta = await takeUpTo(read, key, box.payloadOffset, Math.min(payloadLength, META_CAP));
      return exifFromMeta(key, meta, size, read);
    }
    offset += box.size;
  }
  return null;
}

function instantFromMac(seconds: bigint): CaptureInstant | null {
  // mvhd stores zero when creation_time was left unset.
  if (seconds === 0n) return null;
  const ms = MAC_EPOCH_MS + seconds * 1000n;
  if (ms > 8_640_000_000_000_000n || ms < -8_640_000_000_000_000n) return null;
  const date = new Date(Number(ms));
  if (Number.isNaN(date.getTime())) return null;
  return CaptureInstant.tryCreate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

async function creationFromMvhd(
  key: string,
  box: Box,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  const version = await take(read, key, box.payloadOffset, 4);
  if (!version) return null;
  if (version[0] === 0) {
    const raw = await take(read, key, box.payloadOffset + 4, 4);
    if (!raw) return null;
    const seconds = u32be(raw, 0);
    if (seconds === null) return null;
    return instantFromMac(BigInt(seconds));
  }
  if (version[0] === 1) {
    const raw = await take(read, key, box.payloadOffset + 4, 8);
    if (!raw) return null;
    const seconds = u64(raw, 0, false);
    if (seconds === null) return null;
    return instantFromMac(seconds);
  }
  return null;
}

async function mvhdIn(
  key: string,
  parent: Box,
  fileSize: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  let offset = parent.payloadOffset;
  const end = parent.payloadOffset + parent.size - parent.headerSize;
  for (let child = 0; child < 32 && offset + 8 <= end; child++) {
    const box = await readBox(key, offset, fileSize, read);
    if (!box || offset + box.size > end) return null;
    if (box.type === "mvhd") return creationFromMvhd(key, box, read);
    offset += box.size;
  }
  return null;
}

async function instantFromBmffCreate(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  let offset = 0;
  for (let step = 0; step < MAX_BOX_STEPS && offset + 8 <= size; step++) {
    const box = await readBox(key, offset, size, read);
    if (!box) return null;
    if (box.type === "moov") return mvhdIn(key, box, size, read);
    offset += box.size;
  }
  return null;
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

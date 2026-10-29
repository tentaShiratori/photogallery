import {
  EXIF_CAP,
  MAX_BOX_STEPS,
  META_CAP,
  type RangeRead,
  fourcc,
  take,
  takeUpTo,
  u16be,
  u32be,
  u64,
} from "./bytes.ts";
import { CaptureInstant } from "./civil.ts";
import { dateTimeOriginalFromTiff } from "./image.ts";

export type Box = {
  readonly type: string;
  readonly size: number;
  readonly headerSize: number;
  readonly payloadOffset: number;
};

export async function readBox(key: string, offset: number, fileSize: number, read: RangeRead): Promise<Box | null> {
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

export function boxesIn(bytes: Uint8Array, from: number, to: number): SliceBox[] {
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

function itemExtent(payload: Uint8Array, itemId: number): { method: number; offset: number; length: number } | null {
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
      if (fileOffset > BigInt(Number.MAX_SAFE_INTEGER) || first.length > BigInt(Number.MAX_SAFE_INTEGER)) {
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

export async function instantFromBmffExif(key: string, size: number, read: RangeRead): Promise<CaptureInstant | null> {
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

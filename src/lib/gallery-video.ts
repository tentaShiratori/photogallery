import { type Box, boxesIn, readBox } from "./gallery-bmff.ts";
import {
  MAX_BOX_STEPS,
  META_CAP,
  type RangeRead,
  fourcc,
  takeUpTo,
  u32be,
  u64,
} from "./gallery-bytes.ts";
import { CaptureInstant } from "./gallery-civil.ts";

const MAC_EPOCH_MS = BigInt(Date.UTC(1904, 0, 1));

type MvhdCivilKind = "utc" | "tokyo";

const TOKYO_OFFSET_MS = 9n * 60n * 60n * 1000n;
const CREATIONDATE_KEY = "com.apple.quicktime.creationdate";
const ANDROID_KEY_PREFIX = "com.android.";
const MOOV_CHILD_STEPS = 32;
const META_PATHS = [["meta"], ["udta", "meta"]] as const;

const CREATIONDATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})[+-]\d{4}$/;

function civilFromCreationdate(text: string): CaptureInstant | null {
  const match = CREATIONDATE_TEXT.exec(text);
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

function civilFromMacEpoch(seconds: bigint, kind: MvhdCivilKind): CaptureInstant | null {
  const offset = kind === "tokyo" ? TOKYO_OFFSET_MS : 0n;
  const ms = MAC_EPOCH_MS + seconds * 1000n + offset;
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

function captureFromMvhdCreationSeconds(
  seconds: bigint,
  kind: MvhdCivilKind,
): CaptureInstant | null {
  if (seconds === 0n) return null;
  return civilFromMacEpoch(seconds, kind);
}

function civilFromMvhd(mvhd: Uint8Array, kind: MvhdCivilKind): CaptureInstant | null {
  if (mvhd[0] === 0) {
    const seconds = u32be(mvhd, 4);
    return seconds === null ? null : captureFromMvhdCreationSeconds(BigInt(seconds), kind);
  }
  if (mvhd[0] === 1) {
    const seconds = u64(mvhd, 4, false);
    return seconds === null ? null : captureFromMvhdCreationSeconds(seconds, kind);
  }
  return null;
}

function metaChildren(meta: Uint8Array) {
  const start = u32be(meta, 0) === 0 ? 4 : 0;
  return boxesIn(meta, start, meta.length);
}

function indexFourcc(index: number): string {
  return String.fromCharCode(
    (index >>> 24) & 0xff,
    (index >>> 16) & 0xff,
    (index >>> 8) & 0xff,
    index & 0xff,
  );
}

function eachMdtaKey(keys: Uint8Array, visit: (name: string, index: number) => boolean): void {
  const count = u32be(keys, 4);
  if (count === null) return;
  let pos = 8;
  for (let index = 1; index <= count && pos + 8 <= keys.length; index++) {
    const size = u32be(keys, pos);
    if (size === null || size < 8 || pos + size > keys.length) return;
    if (fourcc(keys, pos + 4) === "mdta") {
      const name = new TextDecoder().decode(keys.subarray(pos + 8, pos + size));
      if (visit(name, index)) return;
    }
    pos += size;
  }
}

function keyIndex(keys: Uint8Array, name: string): number | null {
  let found: number | null = null;
  eachMdtaKey(keys, (keyName, index) => {
    if (keyName === name) {
      found = index;
      return true;
    }
    return false;
  });
  return found;
}

function hasMdtaKeyPrefix(keys: Uint8Array, prefix: string): boolean {
  let found = false;
  eachMdtaKey(keys, (name) => {
    if (name.startsWith(prefix)) {
      found = true;
      return true;
    }
    return false;
  });
  return found;
}

function creationdateFromMeta(meta: Uint8Array): CaptureInstant | null {
  try {
    const children = metaChildren(meta);
    const keys = children.find((box) => box.type === "keys");
    const ilst = children.find((box) => box.type === "ilst");
    if (!keys || !ilst) return null;
    const index = keyIndex(meta.subarray(keys.start, keys.end), CREATIONDATE_KEY);
    if (index === null) return null;
    const item = boxesIn(meta, ilst.start, ilst.end).find((box) => box.type === indexFourcc(index));
    if (!item) return null;
    const data = boxesIn(meta, item.start, item.end).find((box) => box.type === "data");
    if (!data || data.end - data.start < 8) return null;
    if (u32be(meta, data.start) !== 1) return null;
    const value = meta.subarray(data.start + 8, data.end);
    if (value.length === 0 || value.length > 64) return null;
    return civilFromCreationdate(new TextDecoder().decode(value));
  } catch {
    return null;
  }
}

function metaHasAndroidKey(meta: Uint8Array): boolean {
  try {
    const children = metaChildren(meta);
    const keys = children.find((box) => box.type === "keys");
    if (!keys) return false;
    return hasMdtaKeyPrefix(meta.subarray(keys.start, keys.end), ANDROID_KEY_PREFIX);
  } catch {
    return false;
  }
}

function childPayload(bytes: Uint8Array, type: string): Uint8Array | null {
  const found = boxesIn(bytes, 0, bytes.length).find((box) => box.type === type);
  return found ? bytes.subarray(found.start, found.end) : null;
}

async function moovChildren(
  key: string,
  moov: Box,
  fileSize: number,
  read: RangeRead,
): Promise<Box[]> {
  const children: Box[] = [];
  let offset = moov.payloadOffset;
  const end = moov.payloadOffset + moov.size - moov.headerSize;
  for (let step = 0; step < MOOV_CHILD_STEPS && offset + 8 <= end; step++) {
    const box = await readBox(key, offset, fileSize, read);
    if (!box || offset + box.size > end) break;
    children.push(box);
    offset += box.size;
  }
  return children;
}

async function pathPayload(
  children: Box[],
  path: readonly [string, ...string[]],
  key: string,
  fileSize: number,
  read: RangeRead,
): Promise<Uint8Array | null> {
  const [first, ...rest] = path;
  const box = children.find((child) => child.type === first);
  if (!box) return null;
  let payload: Uint8Array | null = await takeUpTo(
    read,
    key,
    box.payloadOffset,
    Math.min(box.size - box.headerSize, META_CAP),
  );
  for (const type of rest) payload = payload && childPayload(payload, type);
  return payload;
}

async function captureFromMoov(
  key: string,
  moov: Box,
  fileSize: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  const children = await moovChildren(key, moov, fileSize, read);
  let android = false;
  for (const path of META_PATHS) {
    const payload = await pathPayload(children, path, key, fileSize, read);
    if (!payload) continue;
    let instant: CaptureInstant | null = null;
    try {
      instant = creationdateFromMeta(payload);
    } catch {
      instant = null;
    }
    if (instant) return instant;
    if (metaHasAndroidKey(payload)) android = true;
  }
  const mvhdBox = children.find((child) => child.type === "mvhd");
  if (!mvhdBox) return null;
  const mvhd = await takeUpTo(
    read,
    key,
    mvhdBox.payloadOffset,
    Math.min(mvhdBox.size - mvhdBox.headerSize, META_CAP),
  );
  try {
    return civilFromMvhd(mvhd, android ? "utc" : "tokyo");
  } catch {
    return null;
  }
}

export async function instantFromBmffCreate(
  key: string,
  size: number,
  read: RangeRead,
): Promise<CaptureInstant | null> {
  let offset = 0;
  for (let step = 0; step < MAX_BOX_STEPS && offset + 8 <= size; step++) {
    const box = await readBox(key, offset, size, read);
    if (!box) return null;
    if (box.type === "moov") return captureFromMoov(key, box, size, read);
    offset += box.size;
  }
  return null;
}

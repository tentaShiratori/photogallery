export type RangeRead = (key: string, offset: number, length: number) => Promise<Uint8Array>;

export const MAX_BOX_STEPS = 64;
export const MAX_CHUNK_STEPS = 64;
export const EXIF_CAP = 256 * 1024;
export const META_CAP = 1024 * 1024;

export function u16(bytes: Uint8Array, offset: number, little: boolean): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, little);
}

export function u32(bytes: Uint8Array, offset: number, little: boolean): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, little);
}

export function u64(bytes: Uint8Array, offset: number, little: boolean): bigint | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, little);
}

export function u16be(bytes: Uint8Array, offset: number): number | null {
  return u16(bytes, offset, false);
}

export function u32be(bytes: Uint8Array, offset: number): number | null {
  return u32(bytes, offset, false);
}

export function fourcc(bytes: Uint8Array, offset: number): string | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

export async function takeUpTo(
  read: RangeRead,
  key: string,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  if (length <= 0 || offset < 0) return new Uint8Array();
  return read(key, offset, length);
}

export async function take(
  read: RangeRead,
  key: string,
  offset: number,
  length: number,
): Promise<Uint8Array | null> {
  const bytes = await takeUpTo(read, key, offset, length);
  if (bytes.length !== length) return null;
  return bytes;
}

export const barePng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

export function macSeconds(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number {
  const seconds =
    (Date.UTC(year, month - 1, day, hour, minute, second) - Date.UTC(1904, 0, 1)) / 1000;
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 0xffffffff) {
    throw new Error(`creation_time does not fit uint32: ${seconds}`);
  }
  return seconds;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index);
  return out;
}

function be16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, false);
  return out;
}

function be32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function le32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function box(type: string, payload: Uint8Array): Uint8Array {
  return concat([be32(8 + payload.length), ascii(type), payload]);
}

function fullBox(type: string, version: number, payload: Uint8Array): Uint8Array {
  const head = new Uint8Array(4);
  head[0] = version;
  return box(type, concat([head, payload]));
}

function box64(type: string, payload: Uint8Array): Uint8Array {
  const header = new Uint8Array(16);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1, false);
  header.set(ascii(type), 4);
  view.setBigUint64(8, BigInt(16 + payload.length), false);
  return concat([header, payload]);
}

function fourccAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function assertExifText(text: string): void {
  if (!/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(text))
    throw new Error(`bad exif text: ${text}`);
}

function tiff(tag: number, text: string, order: "II" | "MM", exifIfd: boolean): Uint8Array {
  assertExifText(text);
  const little = order === "II";
  const bytes = new Uint8Array(exifIfd ? 64 : 46);
  const view = new DataView(bytes.buffer);
  bytes[0] = little ? 0x49 : 0x4d;
  bytes[1] = bytes[0];
  view.setUint16(2, 42, little);
  view.setUint32(4, 8, little);
  view.setUint16(8, 1, little);
  if (!exifIfd) {
    view.setUint16(10, tag, little);
    view.setUint16(12, 2, little);
    view.setUint32(14, 20, little);
    view.setUint32(18, 26, little);
    const raw = `${text}\0`;
    for (let index = 0; index < raw.length; index++) bytes[26 + index] = raw.charCodeAt(index);
    return bytes;
  }
  view.setUint16(10, 0x8769, little);
  view.setUint16(12, 4, little);
  view.setUint32(14, 1, little);
  view.setUint32(18, 26, little);
  view.setUint16(26, 1, little);
  view.setUint16(28, tag, little);
  view.setUint16(30, 2, little);
  view.setUint32(32, 20, little);
  view.setUint32(36, 44, little);
  const raw = `${text}\0`;
  for (let index = 0; index < raw.length; index++) bytes[44 + index] = raw.charCodeAt(index);
  return bytes;
}

function jpegWrap(tiffBytes: Uint8Array): Uint8Array {
  const payload = concat([ascii("Exif\0\0"), tiffBytes]);
  return concat([
    new Uint8Array([0xff, 0xd8, 0xff, 0xe1]),
    be16(payload.length + 2),
    payload,
    new Uint8Array([0xff, 0xd9]),
  ]);
}

export function jpegExif(text: string, order: "II" | "MM" = "MM"): Uint8Array {
  return jpegWrap(tiff(0x9003, text, order, true));
}

export function jpegDateTime(text: string): Uint8Array {
  return jpegWrap(tiff(0x0132, text, "MM", false));
}

export type QuickTimeKeys = {
  readonly items: readonly (readonly [key: string, value: string])[];
  readonly in: "moov" | "udta";
};

function indexedBox(index: number, payload: Uint8Array): Uint8Array {
  return concat([be32(8 + payload.length), be32(index), payload]);
}

function keyedMeta(keys: QuickTimeKeys): Uint8Array {
  const hdlr = fullBox(
    "hdlr",
    0,
    concat([be32(0), ascii("mdta"), new Uint8Array(12), new Uint8Array(1)]),
  );
  const keysBox = fullBox(
    "keys",
    0,
    concat([
      be32(keys.items.length),
      ...keys.items.map(([name]) => concat([be32(8 + name.length), ascii("mdta"), ascii(name)])),
    ]),
  );
  const ilst = box(
    "ilst",
    concat(
      keys.items.map(([, value], index) =>
        indexedBox(index + 1, box("data", concat([be32(1), be32(0), ascii(value)]))),
      ),
    ),
  );
  const body = concat([hdlr, keysBox, ilst]);
  return keys.in === "moov" ? box("meta", body) : box("udta", fullBox("meta", 0, body));
}

export function mp4(options: {
  creationSeconds: number;
  modificationSeconds?: number;
  moov: "before-mdat" | "after-mdat";
  wideMdat?: boolean;
  keys?: QuickTimeKeys;
}): { bytes: Uint8Array; mdatPayloadStart: number; mdatPayloadEnd: number } {
  const ftyp = box("ftyp", concat([ascii("isom"), be32(0)]));
  const payload = new Uint8Array(48).fill(0xab);
  const mdat = options.wideMdat ? box64("mdat", payload) : box("mdat", payload);
  const mvhd = fullBox(
    "mvhd",
    0,
    concat([be32(options.creationSeconds), be32(options.modificationSeconds ?? 0)]),
  );
  // mvhd before meta, as on iPhone, so file order cannot select creationdate ahead of mvhd.
  const moov = box("moov", options.keys ? concat([mvhd, keyedMeta(options.keys)]) : mvhd);
  const headerSize = options.wideMdat ? 16 : 8;
  const parts = options.moov === "after-mdat" ? [ftyp, mdat, moov] : [ftyp, moov, mdat];
  const bytes = concat(parts);
  const mdatPayloadStart =
    options.moov === "after-mdat"
      ? ftyp.length + headerSize
      : ftyp.length + moov.length + headerSize;
  return { bytes, mdatPayloadStart, mdatPayloadEnd: mdatPayloadStart + payload.length };
}

export function heicExif(text: string, decoyCreationSeconds: number, method = 0): Uint8Array {
  const tiffBytes = tiff(0x9003, text, "MM", true);
  const extent = concat([be32(4), tiffBytes]);
  const ftyp = box("ftyp", concat([ascii("heic"), be32(0), ascii("mif1")]));
  const infe = fullBox("infe", 2, concat([be16(1), be16(0), ascii("Exif"), new Uint8Array([0])]));
  const iinf = fullBox("iinf", 0, concat([be16(1), infe]));
  const ilocBody = concat([
    new Uint8Array([0x44, 0x00]),
    be16(1),
    be16(1),
    be16(method),
    be16(0),
    be16(1),
    be32(0),
    be32(extent.length),
  ]);
  const iloc = fullBox("iloc", 1, ilocBody);
  const meta = fullBox("meta", 0, concat([iinf, iloc]));
  const mvhd = fullBox("mvhd", 0, be32(decoyCreationSeconds));
  const moov = box("moov", mvhd);
  const file = concat([ftyp, meta, moov, extent]);
  const ilocStart = ftyp.length + 12 + iinf.length;
  if (fourccAt(file, ilocStart + 4) !== "iloc")
    throw new Error("iloc box is not where the fixture expects");
  const offsetField = ilocStart + 24;
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(offsetField) !== 0) throw new Error("extent offset placeholder is not zero");
  view.setUint32(offsetField, ftyp.length + meta.length + moov.length);
  return file;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  return concat([be32(data.length), ascii(type), data, be32(0)]);
}

export function pngExif(text: string): {
  bytes: Uint8Array;
  idatPayloadStart: number;
  idatPayloadEnd: number;
} {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = pngChunk("IHDR", new Uint8Array(13));
  const exif = pngChunk("eXIf", tiff(0x9003, text, "II", true));
  const idatData = new Uint8Array(180).fill(0x11);
  const idat = pngChunk("IDAT", idatData);
  const iend = pngChunk("IEND", new Uint8Array());
  const bytes = concat([signature, ihdr, exif, idat, iend]);
  const idatPayloadStart = signature.length + ihdr.length + exif.length + 8;
  return { bytes, idatPayloadStart, idatPayloadEnd: idatPayloadStart + idatData.length };
}

function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const pad = data.length % 2 === 1 ? new Uint8Array(1) : new Uint8Array();
  return concat([ascii(type), le32(data.length), data, pad]);
}

export function webpExif(text: string): {
  bytes: Uint8Array;
  framePayloadStart: number;
  framePayloadEnd: number;
} {
  const frame = new Uint8Array(80).fill(0x22);
  const frameChunk = webpChunk("VP8 ", frame);
  const exifChunk = webpChunk("EXIF", tiff(0x9003, text, "MM", true));
  const body = concat([ascii("WEBP"), frameChunk, exifChunk]);
  const bytes = concat([ascii("RIFF"), le32(body.length), body]);
  const framePayloadStart = 20;
  return { bytes, framePayloadStart, framePayloadEnd: framePayloadStart + frame.length };
}

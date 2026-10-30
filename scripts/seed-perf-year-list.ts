/**
 * Seeds a large local R2 persist for `pnpm perf -- --local`.
 * Not part of the product; measurement fixture only.
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getPlatformProxy } from "wrangler";
import type { BodyKey } from "../src/lib/name/index.ts";
import { thumbKeyFor } from "../src/lib/name/index.ts";
import type { Env } from "../src/lib/types.ts";
import { invokedDirectly } from "./lib/invoked-directly.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PERSIST = path.resolve(REPO_ROOT, ".wrangler/state");

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] as const;
const PAIRS_PER_YEAR = 800;

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
  0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

export function bodyKey(year: number, index: number): BodyKey {
  const day = (index % 28) + 1;
  const hour = Math.floor(index / 28) % 24;
  const minute = Math.floor(index / (28 * 24)) % 60;
  const second = Math.floor(index / (28 * 24 * 60)) % 60;
  const key = `${year}-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}-${String(minute).padStart(2, "0")}-${String(second).padStart(2, "0")}-${index + 2}.png`;
  return key as BodyKey;
}

type MediaBucket = {
  put(key: string, body: Uint8Array | Buffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
};

export type SeedDeps = {
  encodeThumb?: (pngBytes: Buffer) => Promise<Buffer>;
  openBucket?: () => Promise<{ bucket: MediaBucket; dispose: () => Promise<void> }>;
  rmSync?: typeof rmSync;
  mkdirSync?: typeof mkdirSync;
  log?: (message: string) => void;
  years?: readonly number[];
  pairsPerYear?: number;
};

async function defaultThumb(pngBytes: Buffer): Promise<Buffer> {
  return sharp(pngBytes)
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: false })
    .webp()
    .toBuffer();
}

async function defaultBucket(): Promise<{ bucket: MediaBucket; dispose: () => Promise<void> }> {
  const { env, dispose } = await getPlatformProxy<Env>({
    configPath: path.resolve(REPO_ROOT, "wrangler.jsonc"),
    persist: { path: path.resolve(PERSIST, "v3") },
  });
  return { bucket: env.MEDIA, dispose };
}

export async function seedPerfYearList(deps: SeedDeps = {}): Promise<number> {
  const remove = deps.rmSync ?? rmSync;
  const makeDir = deps.mkdirSync ?? mkdirSync;
  const log = deps.log ?? ((message: string) => console.error(message));
  const encode = deps.encodeThumb ?? defaultThumb;
  const open = deps.openBucket ?? defaultBucket;
  const years = deps.years ?? YEARS;
  const pairsPerYear = deps.pairsPerYear ?? PAIRS_PER_YEAR;

  remove(PERSIST, { recursive: true, force: true });
  makeDir(PERSIST, { recursive: true });
  const thumb = await encode(png);
  const { bucket, dispose } = await open();

  try {
    let written = 0;
    for (const year of years) {
      for (let i = 0; i < pairsPerYear; i++) {
        const key = bodyKey(year, i);
        await bucket.put(thumbKeyFor(key), thumb, { httpMetadata: { contentType: "image/webp" } });
        await bucket.put(key, png, { httpMetadata: { contentType: "image/png" } });
        written += 1;
      }
      log(`year ${year}: ${pairsPerYear} pairs`);
    }
    const unknown = "u-abc123def456.png" as BodyKey;
    await bucket.put(thumbKeyFor(unknown), thumb, { httpMetadata: { contentType: "image/webp" } });
    await bucket.put(unknown, png, { httpMetadata: { contentType: "image/png" } });
    written += 1;
    log(`done: ${written} bodies (+ thumbs) into ${PERSIST}`);
    return written;
  } finally {
    await dispose();
  }
}

if (invokedDirectly(import.meta.url)) {
  seedPerfYearList().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

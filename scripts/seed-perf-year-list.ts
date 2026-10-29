/**
 * Seeds a large local R2 persist for `pnpm perf:year-list -- --local`.
 * Not part of the product; measurement fixture only.
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getPlatformProxy } from "wrangler";
import type { BodyKey } from "../src/lib/pair.ts";
import { thumbKeyFor } from "../src/lib/pair.ts";
import type { Env } from "../src/lib/types.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PERSIST = path.resolve(REPO_ROOT, ".wrangler/state");

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] as const;
const PAIRS_PER_YEAR = 800;

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

function bodyKey(year: number, index: number): BodyKey {
  const day = (index % 28) + 1;
  const hour = Math.floor(index / 28) % 24;
  const minute = Math.floor(index / (28 * 24)) % 60;
  const second = Math.floor(index / (28 * 24 * 60)) % 60;
  const key = `${year}-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}-${String(minute).padStart(2, "0")}-${String(second).padStart(2, "0")}-${index + 2}.png`;
  return key as BodyKey;
}

async function main(): Promise<void> {
  rmSync(PERSIST, { recursive: true, force: true });
  mkdirSync(PERSIST, { recursive: true });

  const thumb = await sharp(png)
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: false })
    .webp()
    .toBuffer();

  const { env, dispose } = await getPlatformProxy<Env>({
    configPath: path.resolve(REPO_ROOT, "wrangler.jsonc"),
    persist: { path: path.resolve(PERSIST, "v3") },
  });

  try {
    let written = 0;
    for (const year of YEARS) {
      for (let i = 0; i < PAIRS_PER_YEAR; i++) {
        const key = bodyKey(year, i);
        await env.MEDIA.put(thumbKeyFor(key), thumb, {
          httpMetadata: { contentType: "image/webp" },
        });
        await env.MEDIA.put(key, png, { httpMetadata: { contentType: "image/png" } });
        written += 1;
      }
      console.error(`year ${year}: ${PAIRS_PER_YEAR} pairs`);
    }
    const unknown = "u-abc123def456.png" as BodyKey;
    await env.MEDIA.put(thumbKeyFor(unknown), thumb, {
      httpMetadata: { contentType: "image/webp" },
    });
    await env.MEDIA.put(unknown, png, { httpMetadata: { contentType: "image/png" } });
    written += 1;
    console.error(`done: ${written} bodies (+ thumbs) into ${PERSIST}`);
  } finally {
    await dispose();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

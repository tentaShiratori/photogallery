import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BodyKey } from "../src/lib/name/index.ts";
import { thumbKeyFor } from "../src/lib/name/index.ts";
import type { Env } from "../src/lib/types.ts";
import { catalog } from "./catalog.ts";
import type { GalleryPaths } from "./paths.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
  0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const video = Buffer.alloc(1024, 0);
for (let i = 0; i < video.length; i++) video[i] = i % 256;

export class GalleryPrepareBusy extends Error {
  readonly holderPid: number;
  constructor(holderPid: number) {
    super(`e2e persist prepare is held by pid ${holderPid}`);
    this.holderPid = holderPid;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function galleryAlreadyPrepared(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    const html = await response.text();
    return html.includes("フォトギャラリー");
  } catch {
    return false;
  }
}

async function writeCatalog(paths: GalleryPaths): Promise<void> {
  const { default: sharp } = await import("sharp");
  const { getPlatformProxy } = await import("wrangler");
  const thumb = await sharp(png)
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: false })
    .webp()
    .toBuffer();

  const { env, dispose } = await getPlatformProxy<Env>({
    configPath: resolve(repoRoot, "wrangler.jsonc"),
    persist: { path: resolve(paths.pendingDir, "v3") },
  });

  try {
    for (const body of catalog.bodies) {
      const bodyKey = body.key as BodyKey;
      const contentType = body.kind === "video" ? "video/mp4" : "image/png";
      const bytes = body.kind === "video" ? video : png;
      await env.MEDIA.put(thumbKeyFor(bodyKey), thumb, {
        httpMetadata: { contentType: "image/webp" },
      });
      await env.MEDIA.put(body.key, bytes, { httpMetadata: { contentType } });
    }
  } finally {
    await dispose();
  }
}

export async function prepareGallery(paths: GalleryPaths): Promise<void> {
  if (await galleryAlreadyPrepared(paths.url)) {
    return;
  }

  mkdirSync(dirname(paths.lockFile), { recursive: true });

  if (existsSync(paths.lockFile)) {
    const holderPid = Number(readFileSync(paths.lockFile, "utf8").trim());
    if (Number.isInteger(holderPid) && pidAlive(holderPid)) {
      throw new GalleryPrepareBusy(holderPid);
    }
    rmSync(paths.lockFile, { force: true });
  }

  writeFileSync(paths.lockFile, String(process.pid), { flag: "wx" });

  try {
    rmSync(paths.pendingDir, { recursive: true, force: true });
    mkdirSync(paths.pendingDir, { recursive: true });
    await writeCatalog(paths);
    rmSync(paths.persistDir, { recursive: true, force: true });
    renameSync(paths.pendingDir, paths.persistDir);
  } finally {
    rmSync(paths.lockFile, { force: true });
  }
}

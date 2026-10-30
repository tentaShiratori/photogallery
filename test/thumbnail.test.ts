import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vite-plus/test";
import { thumbnailBytes } from "../scripts/lib/thumbnail.ts";
import { barePng } from "./capture.fixtures.ts";

describe("thumbnailBytes", () => {
  it("画像の長辺を 320 の WebP にする", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-thumb-"));
    try {
      const filePath = path.join(dir, "shot.png");
      await writeFile(filePath, barePng);
      const thumb = await thumbnailBytes(filePath, "image");
      expect(thumb.contentType).toBe("image/webp");
      expect(thumb.bytes[0]).toBe(0x52);
      expect(thumb.bytes[8]).toBe(0x57);
      const meta = await sharp(thumb.bytes).metadata();
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(320);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

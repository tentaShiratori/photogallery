import { spawn } from "node:child_process";
import sharp from "sharp";
import type { MediaKind } from "../../src/lib/media.ts";
import type { ThumbnailFile } from "../../src/lib/pair/index.ts";

const LONG_EDGE = 320;

async function encodeWebp(input: string | Uint8Array): Promise<Uint8Array> {
  const bytes = await sharp(input)
    .resize({
      width: LONG_EDGE,
      height: LONG_EDGE,
      fit: "inside",
      withoutEnlargement: false,
    })
    .webp()
    .toBuffer();
  return new Uint8Array(bytes);
}

async function ffmpegBinary(): Promise<string> {
  const imported = await import("ffmpeg-static");
  const ffmpegPath = imported.default;
  if (!ffmpegPath) throw new Error("ffmpeg が見つかりません。");
  return ffmpegPath;
}

function firstFrame(filePath: string, ffmpegPath: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        filePath,
        "-frames:v",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const message = Buffer.concat(errors).toString("utf8").trim();
        reject(new Error(message || `ffmpeg が失敗しました (${code})`));
        return;
      }
      if (chunks.length === 0) {
        reject(new Error("動画の先頭フレームが空です。"));
        return;
      }
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
  });
}

export async function thumbnailBytes(filePath: string, kind: MediaKind): Promise<ThumbnailFile> {
  const source = kind === "video" ? await firstFrame(filePath, await ffmpegBinary()) : filePath;
  return { bytes: await encodeWebp(source), contentType: "image/webp" };
}

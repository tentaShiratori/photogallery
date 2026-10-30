import { spawn as nodeSpawn } from "node:child_process";
import sharp from "sharp";
import type { MediaKind } from "../../src/lib/kind.ts";
import type { ThumbnailFile } from "../../src/lib/name/index.ts";

const LONG_EDGE = 320;

export type FrameChild = {
  stdout: { on(event: "data", listener: (chunk: Buffer) => void): void };
  stderr: { on(event: "data", listener: (chunk: Buffer) => void): void };
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "close", listener: (code: number | null) => void): void;
};

export type FrameSpawn = (
  command: string,
  args: readonly string[],
  options: { stdio: ["ignore", "pipe", "pipe"]; windowsHide: true },
) => FrameChild;

export type ThumbnailDeps = {
  encodeWebp?: (input: string | Uint8Array) => Promise<Uint8Array>;
  ffmpegPath?: () => Promise<string>;
  spawn?: FrameSpawn;
};

async function defaultEncode(input: string | Uint8Array): Promise<Uint8Array> {
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

async function defaultFfmpegPath(): Promise<string> {
  const imported = await import("ffmpeg-static");
  const ffmpegPath = imported.default;
  if (!ffmpegPath) throw new Error("ffmpeg が見つかりません。");
  return ffmpegPath;
}

function defaultSpawn(command: string, args: readonly string[], options: Parameters<FrameSpawn>[2]): FrameChild {
  const child = nodeSpawn(command, [...args], options);
  if (child.stdout === null || child.stderr === null) throw new Error("ffmpeg のパイプがありません。");
  return {
    stdout: child.stdout,
    stderr: child.stderr,
    on(event, listener) {
      child.on(event, listener);
    },
  };
}

function readFrame(filePath: string, ffmpegPath: string, spawn: FrameSpawn): Promise<Uint8Array> {
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

export async function thumbnailBytes(
  filePath: string,
  kind: MediaKind,
  deps: ThumbnailDeps = {},
): Promise<ThumbnailFile> {
  const encode = deps.encodeWebp ?? defaultEncode;
  let source: string | Uint8Array = filePath;
  if (kind === "video") {
    const ffmpeg = await (deps.ffmpegPath ?? defaultFfmpegPath)();
    if (!ffmpeg) throw new Error("ffmpeg が見つかりません。");
    source = await readFrame(filePath, ffmpeg, deps.spawn ?? defaultSpawn);
  }
  return { bytes: await encode(source), contentType: "image/webp" };
}

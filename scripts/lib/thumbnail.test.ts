import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vite-plus/test";
import { barePng } from "../../test/capture.fixtures.ts";
import { thumbnailBytes, type FrameChild, type FrameSpawn } from "./thumbnail.ts";

function scriptedSpawn(
  play: (emit: {
    out: (chunk: Buffer) => void;
    err: (chunk: Buffer) => void;
    error: (error: Error) => void;
    close: (code: number | null) => void;
  }) => void,
): { spawn: FrameSpawn; calls: { command: string; args: readonly string[] }[] } {
  const calls: { command: string; args: readonly string[] }[] = [];
  const spawn: FrameSpawn = (command, args) => {
    calls.push({ command, args });
    const outs: ((chunk: Buffer) => void)[] = [];
    const errs: ((chunk: Buffer) => void)[] = [];
    const errors: ((error: Error) => void)[] = [];
    const closes: ((code: number | null) => void)[] = [];
    const child: FrameChild = {
      stdout: {
        on(_event, listener) {
          outs.push(listener);
        },
      },
      stderr: {
        on(_event, listener) {
          errs.push(listener);
        },
      },
      on(event, listener) {
        if (event === "error") errors.push(listener as (error: Error) => void);
        else closes.push(listener as (code: number | null) => void);
      },
    };
    queueMicrotask(() => {
      play({
        out: (chunk) => {
          for (const listener of outs) listener(chunk);
        },
        err: (chunk) => {
          for (const listener of errs) listener(chunk);
        },
        error: (error) => {
          for (const listener of errors) listener(error);
        },
        close: (code) => {
          for (const listener of closes) listener(code);
        },
      });
    });
    return child;
  };
  return { spawn, calls };
}

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

  it("動画は先頭フレームを渡して WebP にする", async () => {
    const frame = Buffer.from([1, 2, 3, 4]);
    const encoded = new Uint8Array([9, 9]);
    const seen: Array<string | Uint8Array> = [];
    const scripted = scriptedSpawn((emit) => {
      emit.out(frame.subarray(0, 2));
      emit.out(frame.subarray(2));
      emit.close(0);
    });
    const thumb = await thumbnailBytes("/clip.mp4", "video", {
      ffmpegPath: async () => "/bin/ffmpeg",
      spawn: scripted.spawn,
      encodeWebp: async (input) => {
        seen.push(input);
        return encoded;
      },
    });
    expect(thumb).toEqual({ bytes: encoded, contentType: "image/webp" });
    expect(seen).toEqual([new Uint8Array(frame)]);
    expect(scripted.calls[0]?.command).toBe("/bin/ffmpeg");
    expect(scripted.calls[0]?.args).toContain("/clip.mp4");
    expect(scripted.calls[0]?.args).toContain("pipe:1");
  });

  it("ffmpeg が無い、失敗、空、起動エラーを伝える", async () => {
    await expect(
      thumbnailBytes("/clip.mp4", "video", {
        ffmpegPath: async () => "",
        spawn: () => {
          throw new Error("spawn should not run");
        },
      }),
    ).rejects.toThrow("ffmpeg が見つかりません。");

    const stderr = scriptedSpawn((emit) => {
      emit.err(Buffer.from("bad stream"));
      emit.close(1);
    });
    await expect(
      thumbnailBytes("/clip.mp4", "video", { ffmpegPath: async () => "ffmpeg", spawn: stderr.spawn }),
    ).rejects.toThrow("bad stream");

    const empty = scriptedSpawn((emit) => {
      emit.close(7);
    });
    await expect(
      thumbnailBytes("/clip.mp4", "video", { ffmpegPath: async () => "ffmpeg", spawn: empty.spawn }),
    ).rejects.toThrow("ffmpeg が失敗しました (7)");

    const blank = scriptedSpawn((emit) => {
      emit.close(0);
    });
    await expect(
      thumbnailBytes("/clip.mp4", "video", { ffmpegPath: async () => "ffmpeg", spawn: blank.spawn }),
    ).rejects.toThrow("動画の先頭フレームが空です。");

    const boom = scriptedSpawn((emit) => {
      emit.error(new Error("enoent"));
    });
    await expect(
      thumbnailBytes("/clip.mp4", "video", { ffmpegPath: async () => "ffmpeg", spawn: boom.spawn }),
    ).rejects.toThrow("enoent");
  });

  it("画像では spawn を呼ばない", async () => {
    const thumb = await thumbnailBytes("/shot.png", "image", {
      encodeWebp: async () => new Uint8Array([1]),
      spawn: () => {
        throw new Error("spawn should not run");
      },
    });
    expect(thumb.bytes).toEqual(new Uint8Array([1]));
  });
});

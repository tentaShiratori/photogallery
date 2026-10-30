import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vite-plus/test";
import { listUploadTargets, planUploads, type PrepareIo } from "./prepare.ts";

describe("listUploadTargets", () => {
  it("直下の画像・動画だけを残す", async () => {
    const names = await listUploadTargets("/folder", {
      readdir: async () => [
        { name: "a.png", isFile: () => true },
        { name: "notes.txt", isFile: () => true },
        { name: "clip.mp4", isFile: () => true },
        { name: ".secret.png", isFile: () => true },
        { name: "nested", isFile: () => false },
      ],
    });
    expect(names).toEqual(["a.png", "clip.mp4"]);
  });

  it("実フォルダの直下だけを読む", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-prepare-"));
    try {
      await writeFile(path.join(dir, "shot.png"), "png");
      await writeFile(path.join(dir, "notes.txt"), "text");
      await writeFile(path.join(dir, ".hidden.png"), "png");
      await mkdir(path.join(dir, "nested"));
      await writeFile(path.join(dir, "nested", "inner.png"), "png");
      expect(await listUploadTargets(dir)).toEqual(["shot.png"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("planUploads", () => {
  it("撮影日時が無いファイルは内容のハッシュを名前にし、同じ内容は連番にする", async () => {
    const bytes = Buffer.from("abcd");
    const unknownId = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    let closed = 0;
    const io: PrepareIo = {
      stat: async () => ({ size: bytes.byteLength, mtime: new Date() }),
      open: async () => ({
        read: async (buffer, _offset, length) => {
          buffer.fill(0, 0, length);
          return { bytesRead: length };
        },
        close: async () => {
          closed += 1;
        },
      }),
      createReadStream: () => Readable.from([bytes]),
    };
    const planned = await planUploads("/photos", ["one.gif", "two.gif"], io);
    expect(closed).toBe(2);
    expect(planned.map((item) => item.plan.bodyKey)).toEqual([`u-${unknownId}.gif`, `u-${unknownId}-2.gif`]);
    expect(planned[0]?.plan.kind).toBe("image");
    expect(planned[0]?.plan.bodyContentType).toBe("image/gif");
    expect(planned[0]?.plan.thumbKey).toBe(`t/u-${unknownId}.webp`);
    expect(planned[0]?.filePath).toBe(path.join("/photos", "one.gif"));
  });

  it("1 週間より古い更新日時を撮影日時にする", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-plan-"));
    const filePath = path.join(dir, "old.gif");
    try {
      await writeFile(filePath, "gif");
      const mtime = new Date(2000, 0, 2, 3, 4, 5);
      await utimes(filePath, mtime, mtime);
      const planned = await planUploads(dir, ["old.gif"]);
      expect(planned[0]?.plan.bodyKey).toBe("2000-01-02T03-04-05.gif");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("読み取りに失敗したらそのエラーを返す", async () => {
    const io: PrepareIo = {
      stat: async () => ({ size: 1, mtime: new Date() }),
      open: async () => ({
        read: async () => ({ bytesRead: 0 }),
        close: async () => undefined,
      }),
      createReadStream: () => {
        const stream = new Readable({
          read() {
            this.destroy(new Error("read failed"));
          },
        });
        return stream;
      },
    };
    await expect(planUploads("/photos", ["one.gif"], io)).rejects.toThrow("read failed");
  });

  it("埋め込み読み取りで失敗してもハンドルを閉じ、更新日時かハッシュで計画する", async () => {
    const bytes = Buffer.from("abcd");
    const unknownId = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    let closed = 0;
    const io: PrepareIo = {
      stat: async () => ({ size: 4, mtime: new Date() }),
      open: async () => ({
        read: async () => Promise.reject(new Error("range failed")),
        close: async () => {
          closed += 1;
        },
      }),
      createReadStream: () => Readable.from([bytes]),
    };
    const planned = await planUploads("/photos", ["one.jpg"], io);
    expect(closed).toBe(1);
    expect(planned[0]?.plan.bodyKey).toBe(`u-${unknownId}.jpg`);
  });
});

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { PlannedFile } from "../src/lib/name/index.ts";
import type { ObjectBody } from "./lib/object-sink.ts";
import { LocalBusyError, openLocalSink, reportUploadFailure, runUploadLocal } from "./upload-local.ts";

const item: PlannedFile = {
  name: "a.png",
  filePath: "/photos/a.png",
  plan: {
    bodyKey: "u-aaaaaaaaaaaa.png" as PlannedFile["plan"]["bodyKey"],
    thumbKey: "t/u-aaaaaaaaaaaa.webp" as PlannedFile["plan"]["thumbKey"],
    kind: "image",
    bodyContentType: "image/png",
  },
};

afterEach(() => {
  process.exitCode = undefined;
});

describe("runUploadLocal", () => {
  it("フォルダ引数が無い", async () => {
    const errors: string[] = [];
    await runUploadLocal({ argv: [], error: (message) => errors.push(message) });
    expect(errors).toEqual(["使い方: pnpm upload:local <フォルダ>"]);
    expect(process.exitCode).toBe(1);
  });

  it("フォルダではない", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-upload-"));
    const filePath = path.join(dir, "file.png");
    try {
      await writeFile(filePath, "png");
      await expect(runUploadLocal({ argv: [filePath] })).rejects.toThrow(`フォルダではありません: ${filePath}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("対象が空なら上げない", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-upload-"));
    const logs: string[] = [];
    try {
      await runUploadLocal({ argv: [dir], log: (message) => logs.push(message) });
      expect(logs).toEqual(["アップロード対象の画像・動画はフォルダ直下にありませんでした。"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ローカルのバケットが使用中なら止める", async () => {
    const errors: string[] = [];
    let closed = 0;
    const skipDir = { assertDirectory: async () => undefined };
    await runUploadLocal({
      ...skipDir,
      argv: ["/photos"],
      listUploadTargets: async () => ["a.png"],
      planUploads: async () => [item],
      openLocalSink: async () => {
        throw new LocalBusyError();
      },
      error: (message) => errors.push(message),
    });
    expect(errors).toEqual(["`pnpm dev` を止めてから実行して"]);
    expect(process.exitCode).toBe(1);

    await runUploadLocal({
      ...skipDir,
      argv: ["/photos"],
      listUploadTargets: async () => ["a.png"],
      planUploads: async () => [item],
      openLocalSink: async () => ({
        put: async () => undefined,
        close: async () => {
          closed += 1;
        },
      }),
      putAll: async () => {
        throw new LocalBusyError();
      },
      error: (message) => errors.push(message),
    });
    expect(closed).toBe(1);
    expect(process.exitCode).toBe(1);
  });

  it("計画したファイルをシンクへ上げて閉じる", async () => {
    const logs: string[] = [];
    let closed = 0;
    let received: PlannedFile[] = [];
    await runUploadLocal({
      assertDirectory: async () => undefined,
      argv: ["--", "/photos"],
      listUploadTargets: async () => ["a.png"],
      planUploads: async () => [item],
      openLocalSink: async () => ({
        put: async () => undefined,
        close: async () => {
          closed += 1;
        },
      }),
      putAll: async (items) => {
        received = [...items];
      },
      log: (message) => logs.push(message),
    });
    expect(logs[0]).toBe("ローカルの photogallery-media へ 1 件");
    expect(received).toEqual([item]);
    expect(closed).toBe(1);
  });

  it("使用中以外の失敗はそのまま返す", async () => {
    await expect(
      runUploadLocal({
        assertDirectory: async () => undefined,
        argv: ["/photos"],
        listUploadTargets: async () => ["a.png"],
        planUploads: async () => [item],
        openLocalSink: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toThrow("offline");
  });
});

describe("openLocalSink", () => {
  it("一覧が使用中なら捨てて LocalBusyError", async () => {
    let disposed = false;
    await expect(
      openLocalSink(async (options) => {
        expect(options.configPath.endsWith(`${path.sep}wrangler.jsonc`)).toBe(true);
        return {
          env: {
            MEDIA: {
              list: async () => {
                throw new Error("SQLITE_BUSY: database is locked");
              },
              put: async () => undefined,
            } as unknown as R2Bucket,
          },
          dispose: async () => {
            disposed = true;
          },
        };
      }),
    ).rejects.toBeInstanceOf(LocalBusyError);
    expect(disposed).toBe(true);
  });

  it("一覧の別エラーは捨ててから返す", async () => {
    let disposed = false;
    await expect(
      openLocalSink(async () => ({
        env: {
          MEDIA: {
            list: async () => {
              throw "resource busy";
            },
            put: async () => undefined,
          } as unknown as R2Bucket,
        },
        dispose: async () => {
          disposed = true;
        },
      })),
    ).rejects.toBeInstanceOf(LocalBusyError);
    expect(disposed).toBe(true);

    await expect(
      openLocalSink(async () => ({
        env: {
          MEDIA: {
            list: async () => {
              throw new Error("nope");
            },
            put: async () => undefined,
          } as unknown as R2Bucket,
        },
        dispose: async () => undefined,
      })),
    ).rejects.toThrow("nope");
  });

  it("本体は長さ付きで入れ、使用中の put は LocalBusyError", async () => {
    const puts: { key: string; body: unknown; contentType: string | undefined }[] = [];
    let disposed = false;
    const sink = await openLocalSink(async () => ({
      env: {
        MEDIA: {
          list: async () => ({ objects: [] }),
          put: async (key: string, body: unknown, options: { httpMetadata?: { contentType?: string } }) => {
            if (key === "busy") throw new Error("EBUSY: resource busy or locked, locking");
            if (key === "other") throw new Error("denied");
            puts.push({ key, body, contentType: options.httpMetadata?.contentType });
          },
        } as unknown as R2Bucket,
      },
      dispose: async () => {
        disposed = true;
      },
    }));
    const bytes = new Uint8Array([1, 2, 3]);
    await sink.put("thumb", bytes, "image/webp", 3);
    const stream = Readable.from([Buffer.from("hi")]);
    await sink.put("body", stream as unknown as ObjectBody, "image/png", 2);
    await expect(sink.put("busy", bytes, "image/png", 3)).rejects.toBeInstanceOf(LocalBusyError);
    await expect(sink.put("other", bytes, "image/png", 3)).rejects.toThrow();
    expect(puts[0]).toEqual({ key: "thumb", body: bytes, contentType: "image/webp" });
    const streamed = puts[1]?.body as { [symbol: symbol]: number };
    expect(streamed[Symbol.for("miniflare.kStreamLength")]).toBe(2);
    await sink.close();
    expect(disposed).toBe(true);
  });
});

describe("reportUploadFailure", () => {
  it("使用中とそれ以外のメッセージを出して終了コードを立てる", () => {
    const messages: unknown[] = [];
    reportUploadFailure(new LocalBusyError(), (message) => messages.push(message));
    reportUploadFailure(new Error("boom"), (message) => messages.push(message));
    reportUploadFailure("plain", (message) => messages.push(message));
    expect(messages).toEqual(["`pnpm dev` を止めてから実行して", "boom", "plain"]);
    expect(process.exitCode).toBe(1);
  });
});

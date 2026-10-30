import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { PlannedFile } from "../src/lib/name/index.ts";
import { openPrdSink, reportUploadFailure, runUploadPrd } from "./upload-prd.ts";

const r2 = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "photogallery-media",
};

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

describe("runUploadPrd", () => {
  it("フォルダ引数が無い", async () => {
    const errors: string[] = [];
    await runUploadPrd({ argv: ["--"], error: (message) => errors.push(message) });
    expect(errors).toEqual(["使い方: pnpm upload:prd <フォルダ>"]);
    expect(process.exitCode).toBe(1);
  });

  it("フォルダではない", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-prd-"));
    const filePath = path.join(dir, "file.png");
    try {
      await writeFile(filePath, "png");
      await expect(runUploadPrd({ argv: [filePath] })).rejects.toThrow(`フォルダではありません: ${filePath}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("対象が空なら確認しない", async () => {
    const logs: string[] = [];
    let confirmed = false;
    await runUploadPrd({
      argv: ["/photos"],
      assertDirectory: async () => undefined,
      listUploadTargets: async () => [],
      confirmYes: async () => {
        confirmed = true;
        return true;
      },
      log: (message) => logs.push(message),
    });
    expect(logs).toEqual(["アップロード対象の画像・動画はフォルダ直下にありませんでした。"]);
    expect(confirmed).toBe(false);
  });

  it("yes 以外なら何も上げない", async () => {
    const logs: string[] = [];
    let opened = false;
    await runUploadPrd({
      argv: ["/photos"],
      assertDirectory: async () => undefined,
      listUploadTargets: async () => ["a.png"],
      planUploads: async () => [item],
      confirmYes: async () => false,
      openPrdSink: () => {
        opened = true;
        return { put: async () => undefined, close: async () => undefined };
      },
      log: (message) => logs.push(message),
    });
    expect(logs).toEqual(["本番の photogallery-media へ 1 件", "キャンセルしました。何も上げませんでした。"]);
    expect(opened).toBe(false);
  });

  it("yes なら上げ、失敗してもシンクを閉じる", async () => {
    let closed = 0;
    const received: PlannedFile[] = [];
    await expect(
      runUploadPrd({
        argv: ["/photos"],
        assertDirectory: async () => undefined,
        listUploadTargets: async () => ["a.png"],
        planUploads: async () => [item],
        confirmYes: async () => true,
        openPrdSink: () => ({
          put: async () => undefined,
          close: async () => {
            closed += 1;
          },
        }),
        putAll: async (items) => {
          received.push(...items);
          throw new Error("put failed");
        },
      }),
    ).rejects.toThrow("put failed");
    expect(received).toEqual([item]);
    expect(closed).toBe(1);
  });
});

describe("openPrdSink", () => {
  it("バケットと認証先へ put し、close で捨てる", async () => {
    const sent: PutObjectCommand[] = [];
    let destroyed = false;
    const sink = openPrdSink({
      env: r2,
      createClient: (accountId, accessKeyId, secretAccessKey) => {
        expect(accountId).toBe("acct");
        expect(accessKeyId).toBe("key");
        expect(secretAccessKey).toBe("secret");
        return {
          send: async (command) => {
            sent.push(command);
          },
          destroy: () => {
            destroyed = true;
          },
        };
      },
    });
    const body = new Uint8Array([4]);
    await sink.put("k", body, "image/png", 1);
    await sink.close();
    expect(sent[0]?.input).toMatchObject({
      Bucket: "photogallery-media",
      Key: "k",
      Body: body,
      ContentLength: 1,
      ContentType: "image/png",
    });
    expect(destroyed).toBe(true);
  });
});

describe("reportUploadFailure", () => {
  it("メッセージを出して終了コードを立てる", () => {
    const messages: unknown[] = [];
    reportUploadFailure(new Error("boom"), (message) => messages.push(message));
    reportUploadFailure("plain", (message) => messages.push(message));
    expect(messages).toEqual(["boom", "plain"]);
    expect(process.exitCode).toBe(1);
  });
});

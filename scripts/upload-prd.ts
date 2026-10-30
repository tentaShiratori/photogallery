import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as readline from "node:readline/promises";
import { uploadPrdEnv } from "./lib/env.ts";
import { assertDirectory, FolderArgError, resolveFolderArg } from "./lib/folder-arg.ts";
import { invokedDirectly } from "./lib/invoked-directly.ts";
import { destinationLine, type ObjectSink } from "./lib/object-sink.ts";
import { listUploadTargets, planUploads } from "./lib/prepare.ts";
import { putAll } from "./lib/put-all.ts";

type RuntimeEnv = Record<string, string | undefined>;

export type PrdClient = {
  send(command: PutObjectCommand): Promise<unknown>;
  destroy(): void;
};

function defaultClient(accountId: string, accessKeyId: string, secretAccessKey: string): PrdClient {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function openPrdSink(
  deps: {
    env?: RuntimeEnv;
    createClient?: (accountId: string, accessKeyId: string, secretAccessKey: string) => PrdClient;
  } = {},
): ObjectSink {
  const env = uploadPrdEnv(deps.env);
  const client = (deps.createClient ?? defaultClient)(
    env.R2_ACCOUNT_ID,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
  );

  return {
    async put(key, body, contentType, contentLength) {
      await client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
          Body: body,
          ContentLength: contentLength,
          ContentType: contentType,
        }),
      );
    },
    async close() {
      client.destroy();
    },
  };
}

async function confirmYes(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("本番へ上げます。yes と入力してください: ");
    return answer.trim() === "yes";
  } finally {
    rl.close();
  }
}

export type UploadPrdDeps = {
  argv?: readonly string[];
  assertDirectory?: typeof assertDirectory;
  listUploadTargets?: typeof listUploadTargets;
  planUploads?: typeof planUploads;
  putAll?: typeof putAll;
  confirmYes?: () => Promise<boolean>;
  openPrdSink?: () => ObjectSink;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export async function runUploadPrd(deps: UploadPrdDeps = {}): Promise<void> {
  const log = deps.log ?? ((message: string) => console.log(message));
  const error = deps.error ?? ((message: string) => console.error(message));
  const ensureDir = deps.assertDirectory ?? assertDirectory;
  const list = deps.listUploadTargets ?? listUploadTargets;
  const plan = deps.planUploads ?? planUploads;
  const put = deps.putAll ?? putAll;
  const confirm = deps.confirmYes ?? confirmYes;
  const openSink = deps.openPrdSink ?? openPrdSink;

  let folder: string;
  try {
    folder = resolveFolderArg(deps.argv ?? process.argv.slice(2));
  } catch (caught) {
    if (caught instanceof FolderArgError && caught.reason === "missing") {
      error("使い方: pnpm upload:prd <フォルダ>");
      process.exitCode = 1;
      return;
    }
    throw caught;
  }

  try {
    await ensureDir(folder);
  } catch (caught) {
    if (caught instanceof FolderArgError && caught.reason === "not-folder") {
      throw new Error(`フォルダではありません: ${caught.folderPath}`);
    }
    throw caught;
  }

  const names = await list(folder);
  if (names.length === 0) {
    log("アップロード対象の画像・動画はフォルダ直下にありませんでした。");
    return;
  }

  log(destinationLine("prd", names.length));
  const items = await plan(folder, names);

  if (!(await confirm())) {
    log("キャンセルしました。何も上げませんでした。");
    return;
  }

  const sink = openSink();
  try {
    await put(items, sink);
  } finally {
    await sink.close();
  }
}

export function reportUploadFailure(error: unknown, write: (message: unknown) => void = console.error): void {
  write(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

if (invokedDirectly(import.meta.url)) {
  runUploadPrd().catch(reportUploadFailure);
}

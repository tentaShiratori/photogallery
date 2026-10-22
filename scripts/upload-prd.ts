import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as readline from "node:readline/promises";
import { assertDirectory, FolderArgError, resolveFolderArg } from "./lib/folder-arg.ts";
import { destinationLine, type ObjectSink } from "./lib/object-sink.ts";
import { listUploadTargets, planUploads } from "./lib/prepare.ts";
import { putAll } from "./lib/put-all.ts";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} が未設定です。.env.example を見て .env を作ってください。`);
  }
  return value;
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

function openPrdSink(): ObjectSink {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET_NAME");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    async put(key, body, contentType, contentLength) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
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

async function main(): Promise<void> {
  let folder: string;
  try {
    folder = resolveFolderArg(process.argv.slice(2));
  } catch (error) {
    if (error instanceof FolderArgError && error.reason === "missing") {
      console.error("使い方: pnpm upload:prd <フォルダ>");
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  try {
    await assertDirectory(folder);
  } catch (error) {
    if (error instanceof FolderArgError && error.reason === "not-folder") {
      throw new Error(`フォルダではありません: ${error.folderPath}`);
    }
    throw error;
  }

  const names = await listUploadTargets(folder);
  if (names.length === 0) {
    console.log("アップロード対象の画像・動画はフォルダ直下にありませんでした。");
    return;
  }

  console.log(destinationLine("prd", names.length));
  const items = await planUploads(folder, names);

  if (!(await confirmYes())) {
    console.log("キャンセルしました。何も上げませんでした。");
    return;
  }

  const sink = openPrdSink();
  try {
    await putAll(items, sink);
  } finally {
    await sink.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

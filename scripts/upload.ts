import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { contentTypeForName, selectUploadNames } from "../src/media.ts";

const CONCURRENCY = 4;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} が未設定です。.env.example を見て .env を作ってください。`);
  }
  return value;
}

async function fileNamesIn(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function uploadOne(
  client: S3Client,
  bucket: string,
  folder: string,
  name: string,
): Promise<void> {
  const filePath = path.join(folder, name);
  const info = await stat(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: createReadStream(filePath),
      ContentLength: info.size,
      ContentType: contentTypeForName(name),
    }),
  );
  console.log(`uploaded ${name} (${info.size} bytes)`);
}

async function main(): Promise<void> {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error("使い方: pnpm upload -- <フォルダ>");
    process.exitCode = 1;
    return;
  }

  const folder = path.resolve(folderArg);
  const folderStat = await stat(folder).catch(() => null);
  if (!folderStat?.isDirectory()) {
    throw new Error(`フォルダではありません: ${folder}`);
  }

  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET_NAME");

  const selected = selectUploadNames(await fileNamesIn(folder));
  if (selected.length === 0) {
    console.log("アップロード対象の画像・動画はフォルダ直下にありませんでした。");
    return;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log(`${selected.length} 件を ${bucket} へアップロードします。`);
  let index = 0;
  const failures: string[] = [];

  async function worker(): Promise<void> {
    while (index < selected.length) {
      const current = index;
      index += 1;
      const name = selected[current];
      if (!name) return;
      try {
        await uploadOne(client, bucket, folder, name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${name}: ${message}`);
        console.error(`failed ${name}: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selected.length) }, () => worker()));

  if (failures.length > 0) {
    throw new Error(`${failures.length} 件失敗しました。`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { captureFromMtime, embeddedCapture, objectKey } from "../src/lib/gallery.ts";
import { contentTypeForName, extensionOf, selectUploadNames } from "../src/lib/media.ts";

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

async function sha12(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex").slice(0, 12);
}

async function planKey(folder: string, name: string, taken: Set<string>): Promise<string> {
  const filePath = path.join(folder, name);
  const info = await stat(filePath);
  const handle = await open(filePath, "r");
  let embedded: Awaited<ReturnType<typeof embeddedCapture>> = null;
  try {
    embedded = await embeddedCapture(name, info.size, async (_key, offset, length) => {
      const buf = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buf, 0, length, offset);
      return buf.subarray(0, bytesRead);
    });
  } finally {
    await handle.close();
  }
  const captured = embedded ?? captureFromMtime(info.mtime, new Date());
  const unknownId = captured ? "" : await sha12(filePath);
  return objectKey(captured, extensionOf(name), unknownId, taken);
}

async function uploadOne(
  client: S3Client,
  bucket: string,
  folder: string,
  name: string,
  key: string,
): Promise<void> {
  const filePath = path.join(folder, name);
  const info = await stat(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: info.size,
      ContentType: contentTypeForName(name),
    }),
  );
  console.log(`uploaded ${name} -> ${key} (${info.size} bytes)`);
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
  const taken = new Set<string>();
  const planned: { name: string; key: string }[] = [];
  for (const name of selected) {
    planned.push({ name, key: await planKey(folder, name, taken) });
  }

  let index = 0;
  const failures: string[] = [];

  async function worker(): Promise<void> {
    while (index < planned.length) {
      const current = index;
      index += 1;
      const item = planned[current];
      if (!item) return;
      try {
        await uploadOne(client, bucket, folder, item.name, item.key);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${item.name}: ${message}`);
        console.error(`failed ${item.name}: ${message}`);
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

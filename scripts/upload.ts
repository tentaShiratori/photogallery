import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { captureFromMtime, embeddedCapture, type CivilCapture } from "../src/lib/gallery.ts";
import { extensionOf, selectUploadNames } from "../src/lib/media.ts";
import { StemClaim, type PlannedFile } from "../src/lib/pair.ts";
import { thumbnailBytes } from "./thumbnail.ts";

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

async function planFile(folder: string, name: string, stems: StemClaim): Promise<PlannedFile> {
  const filePath = path.join(folder, name);
  const info = await stat(filePath);
  const handle = await open(filePath, "r");
  let embedded: CivilCapture | null = null;
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
  return { name, filePath, plan: stems.plan(captured, extensionOf(name), unknownId) };
}

async function putObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array | ReturnType<typeof createReadStream>,
  contentType: string,
  contentLength: number,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: contentLength,
      ContentType: contentType,
    }),
  );
}

async function putPair(client: S3Client, bucket: string, item: PlannedFile): Promise<void> {
  const info = await stat(item.filePath);
  const thumb = await thumbnailBytes(item.filePath, item.plan.kind);
  await putObject(
    client,
    bucket,
    item.plan.thumbKey,
    thumb.bytes,
    thumb.contentType,
    thumb.bytes.byteLength,
  );
  await putObject(
    client,
    bucket,
    item.plan.bodyKey,
    createReadStream(item.filePath),
    item.plan.bodyContentType,
    info.size,
  );
  console.log(`uploaded ${item.name} -> ${item.plan.bodyKey} (${info.size} bytes)`);
}

async function runPool(
  items: readonly PlannedFile[],
  limit: number,
  job: (item: PlannedFile) => Promise<void>,
): Promise<void> {
  let index = 0;
  const failures: string[] = [];

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      const item = items[current];
      if (!item) return;
      try {
        await job(item);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${item.name}: ${message}`);
        console.error(`failed ${item.name}: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  if (failures.length > 0) {
    throw new Error(`${failures.length} 件失敗しました。`);
  }
}

export async function uploadFolder(
  client: S3Client,
  bucket: string,
  folder: string,
): Promise<void> {
  const selected = selectUploadNames(await fileNamesIn(folder));
  if (selected.length === 0) {
    console.log("アップロード対象の画像・動画はフォルダ直下にありませんでした。");
    return;
  }

  console.log(`${selected.length} 件を ${bucket} へアップロードします。`);
  const stems = new StemClaim();
  const planned: PlannedFile[] = [];
  for (const name of selected) {
    planned.push(await planFile(folder, name, stems));
  }
  await runPool(planned, 4, (item) => putPair(client, bucket, item));
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

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  await uploadFolder(client, bucket, folder);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

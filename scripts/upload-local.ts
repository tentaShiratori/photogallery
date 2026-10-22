import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import type { Env } from "../src/lib/types.ts";
import { assertDirectory, FolderArgError, resolveFolderArg } from "./lib/folder-arg.ts";
import { destinationLine, type ObjectBody, type ObjectSink } from "./lib/object-sink.ts";
import { listUploadTargets, planUploads } from "./lib/prepare.ts";
import { putAll } from "./lib/put-all.ts";

async function bodyBytes(body: ObjectBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(repoRoot, "wrangler.jsonc");

const DEV_BUSY_MESSAGE = "`pnpm dev` を止めてから実行して";

function isBusyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /SQLITE_BUSY|database is locked|EBUSY|resource busy|locking/i.test(message);
}

class LocalBusyError extends Error {
  constructor() {
    super(DEV_BUSY_MESSAGE);
    this.name = "LocalBusyError";
  }
}

async function openLocalSink(): Promise<ObjectSink> {
  const { env, dispose } = await getPlatformProxy<Env>({ configPath });
  const bucket: R2Bucket = env.MEDIA;

  try {
    await bucket.list({ limit: 1 });
  } catch (error) {
    await dispose();
    if (isBusyError(error)) throw new LocalBusyError();
    throw error;
  }

  return {
    async put(key, body: ObjectBody, contentType, _contentLength) {
      try {
        await bucket.put(key, await bodyBytes(body), { httpMetadata: { contentType } });
      } catch (error) {
        if (isBusyError(error)) throw new LocalBusyError();
        throw error;
      }
    },
    async close() {
      await dispose();
    },
  };
}

async function main(): Promise<void> {
  let folder: string;
  try {
    folder = resolveFolderArg(process.argv.slice(2));
  } catch (error) {
    if (error instanceof FolderArgError && error.reason === "missing") {
      console.error("使い方: pnpm upload:local <フォルダ>");
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

  console.log(destinationLine("local", names.length));
  const items = await planUploads(folder, names);

  let sink: ObjectSink;
  try {
    sink = await openLocalSink();
  } catch (error) {
    if (error instanceof LocalBusyError) {
      console.error(DEV_BUSY_MESSAGE);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  try {
    await putAll(items, sink);
  } catch (error) {
    if (error instanceof LocalBusyError) {
      console.error(DEV_BUSY_MESSAGE);
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await sink.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof LocalBusyError) {
    console.error(DEV_BUSY_MESSAGE);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
});

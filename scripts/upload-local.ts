import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import type { Env } from "../src/lib/types.ts";
import { assertDirectory, FolderArgError, resolveFolderArg } from "./lib/folder-arg.ts";
import { invokedDirectly } from "./lib/invoked-directly.ts";
import { destinationLine, type ObjectBody, type ObjectSink } from "./lib/object-sink.ts";
import { listUploadTargets, planUploads } from "./lib/prepare.ts";
import { putAll } from "./lib/put-all.ts";

function localBody(body: ObjectBody, contentLength: number): Uint8Array | ReadableStream {
  if (body instanceof Uint8Array) return body;
  const stream = Readable.toWeb(body);
  // Miniflare rejects a WHATWG stream unless this symbol carries the byte length.
  Object.assign(stream, { [Symbol.for("miniflare.kStreamLength")]: contentLength });
  return stream as ReadableStream;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(repoRoot, "wrangler.jsonc");

const DEV_BUSY_MESSAGE = "`pnpm dev` を止めてから実行して";

function isBusyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /SQLITE_BUSY|database is locked|EBUSY|resource busy|locking/i.test(message);
}

export class LocalBusyError extends Error {
  constructor() {
    super(DEV_BUSY_MESSAGE);
    this.name = "LocalBusyError";
  }
}

type LocalProxy = {
  env: { MEDIA: R2Bucket };
  dispose: () => Promise<void>;
};

export async function openLocalSink(
  load: (options: { configPath: string }) => Promise<LocalProxy> = (options) => getPlatformProxy<Env>(options),
): Promise<ObjectSink> {
  const { env, dispose } = await load({ configPath });
  const bucket: R2Bucket = env.MEDIA;

  try {
    await bucket.list({ limit: 1 });
  } catch (error) {
    await dispose();
    if (isBusyError(error)) throw new LocalBusyError();
    throw error;
  }

  return {
    async put(key, body: ObjectBody, contentType, contentLength) {
      try {
        await bucket.put(key, localBody(body, contentLength), { httpMetadata: { contentType } });
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

export type UploadLocalDeps = {
  argv?: readonly string[];
  assertDirectory?: typeof assertDirectory;
  listUploadTargets?: typeof listUploadTargets;
  planUploads?: typeof planUploads;
  putAll?: typeof putAll;
  openLocalSink?: typeof openLocalSink;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export async function runUploadLocal(deps: UploadLocalDeps = {}): Promise<void> {
  const log = deps.log ?? ((message: string) => console.log(message));
  const error = deps.error ?? ((message: string) => console.error(message));
  const ensureDir = deps.assertDirectory ?? assertDirectory;
  const list = deps.listUploadTargets ?? listUploadTargets;
  const plan = deps.planUploads ?? planUploads;
  const put = deps.putAll ?? putAll;
  const openSink = deps.openLocalSink ?? openLocalSink;

  let folder: string;
  try {
    folder = resolveFolderArg(deps.argv ?? process.argv.slice(2));
  } catch (caught) {
    if (caught instanceof FolderArgError && caught.reason === "missing") {
      error("使い方: pnpm upload:local <フォルダ>");
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

  log(destinationLine("local", names.length));
  const items = await plan(folder, names);

  let sink: ObjectSink;
  try {
    sink = await openSink();
  } catch (caught) {
    if (caught instanceof LocalBusyError) {
      error(DEV_BUSY_MESSAGE);
      process.exitCode = 1;
      return;
    }
    throw caught;
  }

  try {
    await put(items, sink);
  } catch (caught) {
    if (caught instanceof LocalBusyError) {
      error(DEV_BUSY_MESSAGE);
      process.exitCode = 1;
      return;
    }
    throw caught;
  } finally {
    await sink.close();
  }
}

export function reportUploadFailure(error: unknown, write: (message: unknown) => void = console.error): void {
  if (error instanceof LocalBusyError) write(DEV_BUSY_MESSAGE);
  else write(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

if (invokedDirectly(import.meta.url)) {
  runUploadLocal().catch(reportUploadFailure);
}

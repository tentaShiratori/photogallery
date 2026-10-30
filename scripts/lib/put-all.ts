import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { PlannedFile } from "../../src/lib/name/index.ts";
import type { ObjectSink } from "./object-sink.ts";
import { thumbnailBytes } from "./thumbnail.ts";

type FileStat = (filePath: string) => Promise<{ size: number }>;
type OpenStream = (filePath: string) => ReturnType<typeof createReadStream>;

export type PutAllDeps = {
  thumbnailBytes?: (
    filePath: string,
    kind: PlannedFile["plan"]["kind"],
  ) => Promise<{
    bytes: Uint8Array;
    contentType: string;
  }>;
  stat?: FileStat;
  createReadStream?: OpenStream;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

async function defaultStat(filePath: string): Promise<{ size: number }> {
  return stat(filePath);
}

async function putPair(
  sink: ObjectSink,
  item: PlannedFile,
  deps: Required<Pick<PutAllDeps, "thumbnailBytes" | "stat" | "createReadStream" | "log">>,
): Promise<void> {
  const info = await deps.stat(item.filePath);
  const thumb = await deps.thumbnailBytes(item.filePath, item.plan.kind);
  await sink.put(item.plan.thumbKey, thumb.bytes, thumb.contentType, thumb.bytes.byteLength);
  await sink.put(item.plan.bodyKey, deps.createReadStream(item.filePath), item.plan.bodyContentType, info.size);
  deps.log(`uploaded ${item.name} -> ${item.plan.bodyKey} (${info.size} bytes)`);
}

async function runPool(
  items: readonly PlannedFile[],
  limit: number,
  job: (item: PlannedFile) => Promise<void>,
  error: (message: string) => void,
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
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        failures.push(`${item.name}: ${message}`);
        error(`failed ${item.name}: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  if (failures.length > 0) {
    throw new Error(`${failures.length} 件失敗しました。`);
  }
}

export async function putAll(items: readonly PlannedFile[], sink: ObjectSink, deps: PutAllDeps = {}): Promise<void> {
  const thumbnail = deps.thumbnailBytes ?? thumbnailBytes;
  const statFn = deps.stat ?? defaultStat;
  const openStream = deps.createReadStream ?? createReadStream;
  const log = deps.log ?? ((message: string) => console.log(message));
  const error = deps.error ?? ((message: string) => console.error(message));
  await runPool(
    items,
    4,
    (item) => putPair(sink, item, { thumbnailBytes: thumbnail, stat: statFn, createReadStream: openStream, log }),
    error,
  );
}

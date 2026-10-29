import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { PlannedFile } from "../../src/lib/pair/index.ts";
import type { ObjectSink } from "./object-sink.ts";
import { thumbnailBytes } from "./thumbnail.ts";

async function putPair(sink: ObjectSink, item: PlannedFile): Promise<void> {
  const info = await stat(item.filePath);
  const thumb = await thumbnailBytes(item.filePath, item.plan.kind);
  await sink.put(item.plan.thumbKey, thumb.bytes, thumb.contentType, thumb.bytes.byteLength);
  await sink.put(
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

export async function putAll(items: readonly PlannedFile[], sink: ObjectSink): Promise<void> {
  await runPool(items, 4, (item) => putPair(sink, item));
}

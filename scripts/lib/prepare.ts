import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { captureFromMtime, embeddedCapture, type CivilCapture } from "../../src/lib/gallery/index.ts";
import { extensionOf, selectUploadNames } from "../../src/lib/media.ts";
import { StemClaim, type PlannedFile } from "../../src/lib/pair/index.ts";

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

export async function listUploadTargets(folder: string): Promise<string[]> {
  return selectUploadNames(await fileNamesIn(folder));
}

export async function planUploads(folder: string, names: readonly string[]): Promise<PlannedFile[]> {
  const stems = new StemClaim();
  const planned: PlannedFile[] = [];
  for (const name of names) {
    planned.push(await planFile(folder, name, stems));
  }
  return planned;
}

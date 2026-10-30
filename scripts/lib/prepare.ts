import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { captureFromMtime, embeddedCapture, type CivilCapture } from "../../src/lib/capture/index.ts";
import { extensionOf, selectUploadNames } from "../../src/lib/kind.ts";
import { StemClaim, type PlannedFile } from "../../src/lib/name/index.ts";

type DirEntry = { name: string; isFile(): boolean };

type ReadHandle = {
  read(buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number }>;
  close(): Promise<void>;
};

type ByteStream = {
  on(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "end", listener: () => void): unknown;
};

export type PrepareIo = {
  readdir?: (folder: string) => Promise<readonly DirEntry[]>;
  stat?: (filePath: string) => Promise<{ size: number; mtime: Date }>;
  open?: (filePath: string, flags: "r") => Promise<ReadHandle>;
  createReadStream?: (filePath: string) => ByteStream;
};

async function defaultReaddir(folder: string): Promise<readonly DirEntry[]> {
  return readdir(folder, { withFileTypes: true });
}

async function defaultStat(filePath: string): Promise<{ size: number; mtime: Date }> {
  return stat(filePath);
}

async function defaultOpen(filePath: string, flags: "r"): Promise<ReadHandle> {
  return open(filePath, flags);
}

function defaultStream(filePath: string): ByteStream {
  return createReadStream(filePath);
}

function ioOf(io: PrepareIo | undefined): Required<PrepareIo> {
  return {
    readdir: io?.readdir ?? defaultReaddir,
    stat: io?.stat ?? defaultStat,
    open: io?.open ?? defaultOpen,
    createReadStream: io?.createReadStream ?? defaultStream,
  };
}

async function fileNamesIn(folder: string, io: Required<PrepareIo>): Promise<string[]> {
  const entries = await io.readdir(folder);
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function sha12(filePath: string, io: Required<PrepareIo>): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = io.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex").slice(0, 12);
}

async function planFile(folder: string, name: string, stems: StemClaim, io: Required<PrepareIo>): Promise<PlannedFile> {
  const filePath = path.join(folder, name);
  const info = await io.stat(filePath);
  const handle = await io.open(filePath, "r");
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
  const unknownId = captured ? "" : await sha12(filePath, io);
  return { name, filePath, plan: stems.plan(captured, extensionOf(name), unknownId) };
}

export async function listUploadTargets(folder: string, io?: PrepareIo): Promise<string[]> {
  return selectUploadNames(await fileNamesIn(folder, ioOf(io)));
}

export async function planUploads(folder: string, names: readonly string[], io?: PrepareIo): Promise<PlannedFile[]> {
  const stems = new StemClaim();
  const prepared = ioOf(io);
  const planned: PlannedFile[] = [];
  for (const name of names) {
    planned.push(await planFile(folder, name, stems, prepared));
  }
  return planned;
}

import path from "node:path";
import { stat } from "node:fs/promises";

/** Skip a leading `--` left by some package runners, then take the folder. */
export function resolveFolderArg(argv: readonly string[]): string {
  const args = [...argv];
  while (args[0] === "--") args.shift();
  const folderArg = args[0];
  if (!folderArg) {
    throw new FolderArgError("missing");
  }
  return path.resolve(folderArg);
}

export class FolderArgError extends Error {
  reason: "missing" | "not-folder";
  folderPath?: string;

  constructor(reason: "missing" | "not-folder", folderPath?: string) {
    super(reason);
    this.name = "FolderArgError";
    this.reason = reason;
    this.folderPath = folderPath;
  }
}

export async function assertDirectory(folder: string): Promise<void> {
  const folderStat = await stat(folder).catch(() => null);
  if (!folderStat?.isDirectory()) {
    throw new FolderArgError("not-folder", folder);
  }
}

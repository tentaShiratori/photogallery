import { pathToFileURL } from "node:url";

export function invokedDirectly(moduleUrl: string, entry = process.argv[1]): boolean {
  if (entry === undefined || entry.length === 0) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

import type { createReadStream } from "node:fs";

export type ObjectBody = Uint8Array | ReturnType<typeof createReadStream>;

export type ObjectSink = {
  put(key: string, body: ObjectBody, contentType: string, contentLength: number): Promise<void>;
  close(): Promise<void>;
};

export const BUCKET_DISPLAY_NAME = "photogallery-media";

export function destinationLine(kind: "local" | "prd", count: number): string {
  const where = kind === "local" ? "ローカル" : "本番";
  return `${where}の ${BUCKET_DISPLAY_NAME} へ ${count} 件`;
}

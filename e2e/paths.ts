import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const E2E_PORT = 8798;

export type E2EPort = typeof E2E_PORT;

export type GalleryPaths = {
  readonly port: E2EPort;
  readonly url: `http://127.0.0.1:${E2EPort}`;
  readonly persistDir: string;
  readonly pendingDir: string;
  readonly lockFile: string;
};

export function galleryPaths(configUrl: string): GalleryPaths {
  const root = dirname(fileURLToPath(configUrl));
  const persistDir = resolve(root, "e2e/state");
  return {
    port: E2E_PORT,
    url: `http://127.0.0.1:${E2E_PORT}`,
    persistDir,
    pendingDir: `${persistDir}.pending`,
    lockFile: resolve(root, "e2e/state.lock"),
  };
}

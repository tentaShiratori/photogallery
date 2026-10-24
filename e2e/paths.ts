import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Parent of the wrangler `v3` directory. Never `.wrangler/state` and never a verify run directory. */
export const E2E_PORT = 8798;

export type E2EPort = typeof E2E_PORT;

export type GalleryPaths = {
  readonly port: E2EPort;
  readonly url: `http://127.0.0.1:${E2EPort}`;
  readonly persistDir: string;
  readonly pendingDir: string;
  readonly lockFile: string;
};

/** Resolves directories from the config file URL, so a worker and the runner name the same paths. */
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

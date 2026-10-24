import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
import { accessHeaders } from "./e2e/access.ts";
import { galleryPaths } from "./e2e/paths.ts";
import { prepareGallery } from "./e2e/seed.ts";
import { mobileViewport, pcViewport } from "./e2e/viewports.ts";

const paths = galleryPaths(import.meta.url);
await prepareGallery(paths);

const command = {
  executable: "pnpm",
  args: ["dev", "--", "--host", "127.0.0.1", "--port", String(paths.port), "--strictPort"],
  env: { PHOTOGALLERY_PERSIST: paths.persistDir },
  startupTimeout: 120_000,
  log: ".e2e/logs/dev.log",
} as const;

const app = { url: paths.url, command };

export default {
  tests: ["tests/**/*.e2e.ts"],
  reporters: ["list", "junit"],
  targets: [
    {
      name: "pc",
      engine: web({
        browser: "chromium",
        viewport: pcViewport(),
        headers: accessHeaders,
      }),
      app,
    },
    {
      name: "mobile",
      engine: web({
        browser: "chromium",
        viewport: mobileViewport(),
        headers: accessHeaders,
      }),
      app,
    },
  ],
} satisfies E2EConfig;

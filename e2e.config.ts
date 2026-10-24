import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
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

export default {
  tests: ["tests/**/*.e2e.ts"],
  reporters: ["list", "junit"],
  targets: [
    {
      name: "pc",
      engine: web({ browser: "chromium", viewport: pcViewport() }),
      app: { url: paths.url, command },
    },
    {
      name: "mobile",
      engine: web({ browser: "chromium", viewport: mobileViewport() }),
      app: { url: paths.url, command },
    },
  ],
} satisfies E2EConfig;

import { cloudflare } from "@cloudflare/vite-plugin";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import ssrPlugin from "vite-ssr-components/plugin";
import { defineConfig } from "vite-plus";

const persistPath = process.env.PHOTOGALLERY_PERSIST;

export default defineConfig(() => ({
  server: {
    port: 8787,
  },
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "hono/jsx",
    },
  },
  plugins: process.env.VITEST
    ? [ssrPlugin()]
    : [cloudflare(persistPath ? { persistState: { path: persistPath } } : {}), ssrPlugin()],
  fmt: {
    endOfLine: "lf",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["tests/**/*.e2e.ts", "e2e/locators.ts"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["**/e2e/seed.ts", "**/e2e/seed"],
                  message: "Tests must not import the e2e seed; use catalog and locators.",
                },
              ],
            },
          ],
        },
      },
    ],
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
            "test/**/*.test.ts",
            "test/**/*.test.tsx",
          ],
          exclude: ["test/worker.test.ts", "**/node_modules/**"],
        },
      },
      {
        plugins: [
          cloudflareTest({
            main: "src/index.tsx",
            wrangler: { configPath: "wrangler.jsonc" },
          }),
        ],
        test: {
          name: "worker",
          include: ["test/worker.test.ts"],
        },
      },
    ],
  },
}));

import { cloudflare } from "@cloudflare/vite-plugin";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import ssrPlugin from "vite-ssr-components/plugin";
import { defineConfig } from "vite-plus";

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
  plugins: process.env.VITEST ? [ssrPlugin()] : [cloudflare(), ssrPlugin()],
  fmt: {
    endOfLine: "lf",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
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

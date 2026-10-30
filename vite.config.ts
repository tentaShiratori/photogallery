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
    printWidth: 120,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
    },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["**/node_modules/**", ".agents/**"],
    overrides: [
      {
        files: ["tests/**/*.e2e.ts", "e2e/locators.ts", "e2e/spec-screenshot.ts", "e2e/access.ts"],
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
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx}"],
      exclude: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/*.fixtures.ts",
        "**/types.ts",
        "**/*.d.ts",
        "src/lib/media/index.ts",
        "src/lib/name/index.ts",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
            "scripts/**/*.test.ts",
            "test/**/*.test.ts",
            "test/**/*.test.tsx",
          ],
          exclude: ["test/worker.test.ts", "src/**/*.dom.test.ts", "src/**/*.dom.test.tsx", "**/node_modules/**"],
        },
      },
      {
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/**/*.dom.test.ts", "src/**/*.dom.test.tsx"],
          exclude: ["**/node_modules/**"],
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

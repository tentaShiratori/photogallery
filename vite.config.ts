import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import stylex from "@stylexjs/unplugin";

const persistPath = process.env.PHOTOGALLERY_PERSIST;

const appPlugins = [
  devtools(),
  stylex.vite({ useCSSLayers: true, devPersistToDisk: true }),
  tailwindcss(),
  tanstackStart(),
  viteReact(),
  cloudflare(
    persistPath
      ? { persistState: { path: persistPath }, viteEnvironment: { name: "ssr" } }
      : { viteEnvironment: { name: "ssr" } },
  ),
];

// stylex.vite's configureServer leaves a watcher that blocks Vitest exit; rollup build avoids it.
const vitestPlugins = [devtools(), stylex.rollup({ useCSSLayers: true }), tailwindcss(), tanstackStart(), viteReact()];

export default defineConfig(() => ({
  server: {
    port: 8787,
  },
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  plugins: process.env.VITEST ? vitestPlugins : appPlugins,
  fmt: {
    endOfLine: "lf",
    printWidth: 120,
    ignorePatterns: ["src/routeTree.gen.ts"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
    },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["**/node_modules/**", ".agents/**", "src/routeTree.gen.ts"],
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
    server: {
      deps: {
        inline: [/@tanstack\/(start-server-core|react-start)/],
      },
    },
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
          exclude: [
            "src/**/*.dom.test.ts",
            "src/**/*.dom.test.tsx",
            "src/**/*.worker.test.ts",
            "src/**/*.worker.test.tsx",
            "**/node_modules/**",
          ],
        },
      },
      {
        plugins: [
          cloudflareTest({
            main: "src/server.ts",
            wrangler: { configPath: "wrangler.jsonc" },
          }),
        ],
        test: {
          name: "worker",
          environment: "node",
          include: ["src/**/*.worker.test.ts", "src/**/*.worker.test.tsx"],
          exclude: ["**/node_modules/**"],
        },
      },
      {
        test: {
          name: "dom",
          environment: "happy-dom",
          setupFiles: ["test/dom-setup.ts"],
          include: ["src/**/*.dom.test.ts", "src/**/*.dom.test.tsx"],
          exclude: ["**/node_modules/**"],
        },
      },
    ],
  },
}));

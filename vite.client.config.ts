import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/static",
    emptyOutDir: true,
    lib: {
      entry: "src/routes/lib/client.tsx",
      formats: ["es"],
      fileName: () => "client.js",
    },
    rollupOptions: {
      output: {
        // Keep as single bundle
      },
    },
    minify: true,
    target: "esnext",
    cssCodeSplit: false,
  },
  esbuild: {
    jsxImportSource: "hono/jsx",
    jsx: "automatic",
  },
});

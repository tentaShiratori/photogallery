import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const fmtExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".html",
]);
const lintExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.file_path;

function finish(failed, output) {
  process.stdout.write("{}\n");
  if (!failed) {
    process.exit(0);
  }
  process.stderr.write(output);
  process.exit(2);
}

if (typeof filePath !== "string" || filePath.length === 0 || !existsSync(filePath)) {
  finish(false, "");
}

const root = process.cwd();
const relative = path.relative(root, filePath);
const normalized = relative.split(path.sep).join("/");
if (
  relative.startsWith("..") ||
  path.isAbsolute(relative) ||
  normalized === "pnpm-lock.yaml" ||
  normalized.startsWith("node_modules/") ||
  normalized.startsWith(".wrangler/") ||
  normalized.startsWith(".git/")
) {
  finish(false, "");
}

const extension = path.extname(filePath).toLowerCase();
const vpBin = path.join(root, "node_modules", "vite-plus", "bin", "vp");
let output = "";
let failed = false;

function run(args) {
  const result = spawnSync(process.execPath, [vpBin, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  output += result.stdout ?? "";
  output += result.stderr ?? "";
  if (result.error || result.status !== 0) {
    failed = true;
  }
}

if (fmtExtensions.has(extension)) {
  run(["fmt", filePath]);
}
if (lintExtensions.has(extension)) {
  run(["lint", filePath]);
}

finish(failed, output);

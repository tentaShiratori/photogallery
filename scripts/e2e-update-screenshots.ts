import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UPDATE_SPEC_ENV } from "../e2e/update-spec.ts";

const e2eBin = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/e2e/dist/cli/bin.js",
);

const child = spawn(
  process.execPath,
  [e2eBin, "run", "--update-snapshots", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, [UPDATE_SPEC_ENV]: "1" },
  },
);

child.on("exit", (code, signal) => {
  if (signal !== null) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});

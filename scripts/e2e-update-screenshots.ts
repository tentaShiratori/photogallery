import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UPDATE_SPEC_ENV } from "../e2e/update-spec.ts";
import { invokedDirectly } from "./lib/invoked-directly.ts";

const e2eBin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../node_modules/e2e/dist/cli/bin.js");

export type ScreenshotChild = {
  on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
};

export function startScreenshotUpdate(
  deps: {
    spawn?: (
      command: string,
      args: readonly string[],
      options: { stdio: "inherit"; env: NodeJS.ProcessEnv },
    ) => ScreenshotChild;
    argv?: readonly string[];
    execPath?: string;
    env?: NodeJS.ProcessEnv;
    exit?: (code: number) => void;
  } = {},
): ScreenshotChild {
  const start =
    deps.spawn ??
    ((command, args, options) => {
      const child = spawn(command, [...args], options);
      return {
        on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void) {
          child.on(event, listener);
        },
      };
    });
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const child = start(
    deps.execPath ?? process.execPath,
    [e2eBin, "run", "--update-snapshots", ...(deps.argv ?? process.argv.slice(2))],
    {
      stdio: "inherit",
      env: { ...(deps.env ?? process.env), [UPDATE_SPEC_ENV]: "1" },
    },
  );
  child.on("exit", (code, signal) => {
    if (signal !== null) {
      exit(1);
      return;
    }
    exit(code ?? 1);
  });
  return child;
}

if (invokedDirectly(import.meta.url)) {
  startScreenshotUpdate();
}

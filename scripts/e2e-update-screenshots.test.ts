import { describe, expect, it } from "vite-plus/test";
import { UPDATE_SPEC_ENV } from "../e2e/update-spec.ts";
import { startScreenshotUpdate } from "./e2e-update-screenshots.ts";

describe("startScreenshotUpdate", () => {
  it("e2e に update-snapshots と仕様スクショ印を渡す", () => {
    const exits: number[] = [];
    const spawned: { command: string; args: readonly string[]; env: NodeJS.ProcessEnv }[] = [];
    let onExit: ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;
    startScreenshotUpdate({
      argv: ["tests/uc-01.e2e.ts"],
      execPath: "/node",
      env: { KEEP: "1" },
      exit: (code) => exits.push(code),
      spawn: (command, args, options) => {
        spawned.push({ command, args, env: options.env });
        return {
          on(_event, listener) {
            onExit = listener;
          },
        };
      },
    });
    expect(spawned[0]?.command).toBe("/node");
    expect(spawned[0]?.args.slice(1, 3)).toEqual(["run", "--update-snapshots"]);
    expect(spawned[0]?.args.at(-1)).toBe("tests/uc-01.e2e.ts");
    expect(spawned[0]?.env[UPDATE_SPEC_ENV]).toBe("1");
    expect(spawned[0]?.env.KEEP).toBe("1");
    onExit?.(0, null);
    expect(exits).toEqual([0]);
    onExit?.(null, "SIGTERM");
    onExit?.(null, null);
    expect(exits).toEqual([0, 1, 1]);
  });
});

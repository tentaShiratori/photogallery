import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Keep in sync with `loop_limit` on the stop hook in `.cursor/hooks.json`. */
const MAX_LOOP = 5;
const OUTPUT_LIMIT = 12_000;

const input = JSON.parse(readFileSync(0, "utf8"));
const status = input.status;
const loopCount = typeof input.loop_count === "number" ? input.loop_count : 0;

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}

if (status !== "completed") {
  respond({});
}

if (loopCount >= MAX_LOOP) {
  process.stderr.write(
    `stop hook: loop_count=${loopCount} reached MAX_LOOP=${MAX_LOOP}; skipping follow-up\n`,
  );
  respond({});
}

const root = process.cwd();
const result = spawnSync("pnpm", ["check"], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
});

let output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
if (result.error) {
  output = `${result.error.message}\n${output}`.trim();
}

if (!result.error && result.status === 0) {
  respond({});
}

if (output.length > OUTPUT_LIMIT) {
  output = output.slice(-OUTPUT_LIMIT);
}

const exitLabel = result.error ? "spawn error" : `exit ${result.status ?? "unknown"}`;
const message = [
  "Cursor の stop hook が `pnpm check` を実行して失敗しました。下の出力を直してから続けてください。",
  "",
  `結果: ${exitLabel}`,
  "",
  "```text",
  output || "(出力なし)",
  "```",
].join("\n");

respond({ followup_message: message });

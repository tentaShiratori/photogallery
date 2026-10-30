import { existsSync, mkdirSync } from "node:fs";
import { ensureAccess } from "./access.ts";
import { openContext } from "./chrome.ts";
import { parseArgs } from "./cli.ts";
import { PROFILE_DIR, READY_MARKER } from "./constants.ts";
import { runScenarios } from "./driver.ts";

export async function runPerf(argv: readonly string[]): Promise<void> {
  const { local, url, scenarios, year } = parseArgs(argv);
  mkdirSync(PROFILE_DIR, { recursive: true });

  const accessReady = existsSync(READY_MARKER);
  const needHeadedLogin = !local && !accessReady;

  if (needHeadedLogin) {
    console.error(`初回ログイン: 計測専用プロフィールでブラウザを開きます (${PROFILE_DIR})`);
    const headed = await openContext(false);
    try {
      await ensureAccess(headed, url, true);
    } finally {
      await headed.close();
    }
  }

  const context = await openContext(true);
  try {
    if (!local) {
      await ensureAccess(context, url, false);
    }
    await runScenarios(context, url, local, scenarios, year);
  } catch (error) {
    await context.close().catch(() => undefined);
    throw error;
  }
}

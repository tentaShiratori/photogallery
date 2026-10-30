import { existsSync, mkdirSync } from "node:fs";
import { ensureAccess } from "./access.ts";
import { openContext } from "./chrome.ts";
import { parseArgs } from "./cli.ts";
import { PROFILE_DIR, READY_MARKER } from "./constants.ts";
import { runScenarios } from "./driver.ts";

export async function runPerf(
  argv: readonly string[],
  deps: {
    openContext?: typeof openContext;
    ensureAccess?: typeof ensureAccess;
    runScenarios?: typeof runScenarios;
    existsSync?: typeof existsSync;
    mkdirSync?: typeof mkdirSync;
    error?: (message: string) => void;
  } = {},
): Promise<void> {
  const open = deps.openContext ?? openContext;
  const access = deps.ensureAccess ?? ensureAccess;
  const scenariosRun = deps.runScenarios ?? runScenarios;
  const exists = deps.existsSync ?? existsSync;
  const makeDir = deps.mkdirSync ?? mkdirSync;
  const error = deps.error ?? ((message: string) => console.error(message));
  const { local, url, scenarios, year } = parseArgs(argv);
  makeDir(PROFILE_DIR, { recursive: true });

  const accessReady = exists(READY_MARKER);
  const needHeadedLogin = !local && !accessReady;

  if (needHeadedLogin) {
    error(`初回ログイン: 計測専用プロフィールでブラウザを開きます (${PROFILE_DIR})`);
    const headed = await open(false);
    try {
      await access(headed, url, true);
    } finally {
      await headed.close();
    }
  }

  const context = await open(true);
  try {
    if (!local) {
      await access(context, url, false);
    }
    await scenariosRun(context, url, local, scenarios, year);
  } catch (caught) {
    await context.close().catch(() => undefined);
    throw caught;
  }
}

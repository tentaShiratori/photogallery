/**
 * Measures year-list load times in a real Chrome profile.
 *
 * Default target is production (Cloudflare Access). Use `--local` for
 * http://localhost:8787. Override the production URL with PHOTOGALLERY_URL.
 *
 * First production run opens a headed window so you can sign in once; later
 * runs reuse ~/.photogallery-perf headless.
 */
import { existsSync, mkdirSync } from "node:fs";
import { parseArgs, PROFILE_DIR } from "./lib/perf-year-list/cli.ts";
import { runBenchmark } from "./lib/perf-year-list/report.ts";
import { ensureAccess, openContext, READY_MARKER } from "./lib/perf-year-list/run.ts";

async function main(): Promise<void> {
  const { local, url } = parseArgs(process.argv.slice(2));
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
    await runBenchmark(context, url, local);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

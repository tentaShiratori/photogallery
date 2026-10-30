/**
 * Measures gallery screens under a shared protocol.
 *
 * Default target is production (Cloudflare Access). Use `--local` for
 * http://localhost:8787. Override the production URL with PHOTOGALLERY_URL.
 *
 * First production run opens a headed window so you can sign in once; later
 * runs reuse ~/.photogallery-perf headless.
 */
import { runPerf } from "./lib/perf/main.ts";

runPerf(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * Alias of `pnpm perf -- --scenario year-list`.
 */
import { runPerf } from "./lib/perf/main.ts";

runPerf(["--scenario", "year-list", ...process.argv.slice(2)]).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

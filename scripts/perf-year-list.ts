/**
 * Alias of `pnpm perf -- --scenario year-list`.
 */
import { invokedDirectly } from "./lib/invoked-directly.ts";
import { startPerf } from "./perf.ts";

export function startYearListPerf(
  argv: readonly string[] = process.argv.slice(2),
  deps?: Parameters<typeof startPerf>[1],
): Promise<void> {
  return startPerf(["--scenario", "year-list", ...argv], deps);
}

if (invokedDirectly(import.meta.url)) {
  void startYearListPerf();
}

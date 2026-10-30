/**
 * Measures gallery screens under a shared protocol.
 *
 * Default target is production (Cloudflare Access). Use `--local` for
 * http://localhost:8787. Override the production URL with PHOTOGALLERY_URL.
 *
 * First production run opens a headed window so you can sign in once; later
 * runs reuse ~/.photogallery-perf headless.
 */
import { invokedDirectly } from "./lib/invoked-directly.ts";
import { runPerf } from "./lib/perf/main.ts";

export function startPerf(
  argv: readonly string[] = process.argv.slice(2),
  deps: {
    run?: (argv: readonly string[]) => Promise<void>;
    exit?: (code: number) => void;
    error?: (message: unknown) => void;
  } = {},
): Promise<void> {
  const run = deps.run ?? runPerf;
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const error = deps.error ?? ((message: unknown) => console.error(message));
  return run(argv).catch((caught: unknown) => {
    error(caught instanceof Error ? caught.message : caught);
    exit(1);
  });
}

if (invokedDirectly(import.meta.url)) {
  void startPerf();
}

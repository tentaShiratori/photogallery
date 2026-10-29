---
name: verify-photogallery
description: >-
  Verify photogallery changes with the repo's targeted tests, e2e, deadcode,
  and the year-list perf harness. Use when finishing a PR, checking gallery
  behavior, or running pnpm perf:year-list.
---

# verify-photogallery

Follow [AGENTS.md](../../../AGENTS.md) for which unit test file to run after a
source change. Do not run the whole unit suite in one command.

## Commands

- `pnpm typecheck`
- `pnpm exec vp fmt` / `pnpm exec vp lint` on touched files (or let hooks run)
- `pnpm test run <file>` for each touched area
- `pnpm deadcode` must exit 0
- Gallery UC changes: `pnpm e2e` (screenshot baselines must stay green unless
  the UC look intentionally changed and screenshots were retaken)

## Year-list performance (`pnpm perf:year-list`)

Measures only the year list. Does not speed anything up; it prints numbers.

- Default URL is production. Override with `PHOTOGALLERY_URL`. Local:
  `pnpm perf:year-list -- --local` (expects `pnpm dev` on port 8787).
- Browser profile: `~/.photogallery-perf` (outside the repo). First production
  run is headed for Cloudflare Access login; later runs are headless.
- Protocol: 1 warmup discarded, then 10 measured runs; cache cleared each run;
  new page each run. Report per-run values plus median, p90, and max. Header
  lines: JST timestamp, URL, commit, run count. stdout only — no history file.

### Reading the numbers (benchmark-checklist)

Before treating a number as a reason to change code, check:

1. **Limiter** — Is the wait mostly `Server-Timing` `r2` / `total`, the gap
   from `year-list-api` to `year-list-ready` (client paint / thumbs), or time
   to `year-list-loading` (shell)? Name what is slow with the printed split.
2. **Repeatability** — Do the 10 runs agree? Prefer median; if max ≫ median,
   say the spread is wide and do not claim a tight figure.
3. **Story** — Does the split match the architecture (sequential per-year R2
   lists on the server, one `/api/media` fetch, then thumbs)? If a speedup
   claim moves a metric that was not the limiter, the claim is wrong.

Cloud agents cannot pass Access: run `--local`, paste the full terminal
output into the PR, and leave production login verification to the owner.

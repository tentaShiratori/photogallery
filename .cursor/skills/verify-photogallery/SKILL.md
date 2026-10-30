---
name: verify-photogallery
description: >-
  Verify photogallery changes with the repo's targeted tests, e2e, and
  deadcode. Use when finishing a PR or checking gallery behavior. Run pnpm
  perf only when the user asked to measure or improve speed.
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

Do not run `pnpm perf` when finishing a regular PR or as a cloud agent. Run it
only when the user asked to measure speed or to make the gallery faster.

## Performance (`pnpm perf`)

Measures the year list, year screen, and enlarged view. Does not speed
anything up; it prints numbers from Playwright, web-vitals, and Lighthouse.

- Default URL is production. Override with `PHOTOGALLERY_URL`. Local:
  `pnpm seed:perf` then `pnpm perf -- --local` (expects `pnpm dev` on port
  8787). One scenario: `--scenario year-list|year-screen|enlarged`. Year:
  `--year 2024`. `pnpm perf:year-list` is an alias for the year list.
- Browser profile: `~/.photogallery-perf` (outside the repo). First production
  run is headed for Cloudflare Access login; later runs are headless.
- Playwright / web-vitals: 1 warmup discarded, then 10 measured runs; cache
  cleared each run; new page each run; viewport 1280×900. Lighthouse: desktop
  lab throttling, Performance only, 1 warmup + 3 runs, URL screens only
  (enlarged view is skipped). Report per-run values plus median, p90, and max.
  Header lines: JST timestamp, URL, commit, run count. stdout only — no history
  file and no Lighthouse HTML.

### Reading the numbers (benchmark-checklist)

Before treating a number as a reason to change code, check:

1. **Limiter** — Is the wait mostly `Server-Timing` `r2` / `total`, the gap
   from the API mark to ready (client paint / thumbs), time to loading
   (shell), or a Lighthouse / web-vitals paint metric? Name what is slow with
   the printed split. Playwright is unthrottled; Lighthouse is a desktop lab
   run. Do not treat them as the same number.
2. **Repeatability** — Do the 10 Playwright runs agree? Prefer median; if max ≫
   median, say the spread is wide and do not claim a tight figure.
3. **Story** — Does the split match the architecture (R2 lists on the server,
   one `/api/media` fetch, then thumbs or the body)? If a speedup claim moves
   a metric that was not the limiter, the claim is wrong.

Cloud agents cannot pass Access. Production login and production numbers stay
with the owner. Do not paste perf output into a PR unless the task was to
measure or improve speed.

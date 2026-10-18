# Photogallery verification map

This directory is the maintained source for verifying the user-facing behavior of photogallery. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `node .cursor/skills/verify-photogallery/scripts/verify.mjs launch` so the app is at `http://127.0.0.1:8797` and local R2 contains `verify.png` and `verify.mp4`.
- Run `node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` and require that URL, the seeded keys, and a persist path under `.cursor/skills/verify-photogallery/runs/`.
- Never drive port `8787` or `.wrangler/state`. That is the user's dev session.
- Only one verification instance may run. A second `launch` must fail while the recorded pid is alive.

## Driving conventions

- Start every recipe from the seeded baseline unless its preconditions say `--empty`.
- Prefer the heading `フォトギャラリー`, `#status`, `#grid`, button name `verify.png`, `dialog#viewer`, button name `閉じる`, and `#caption`.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through the Cursor browser against the recorded URL.
- Run HTTP actions through `curl.exe`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an accessibility snapshot and a screenshot with `フォトギャラリー` visible.
- HTTP proof includes the status, headers, and body.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with browser and curl` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Gallery](./gallery.md) covers the seeded grid, the empty gallery, and the object list the page renders.
- [Viewer](./viewer.md) covers opening a photo, reading its caption, and closing the dialog.
- [Identity](./identity.md) covers the local-preview label and the Access email heading.
- [Media delivery](./media-delivery.md) covers image bytes, a video tile, and byte ranges.

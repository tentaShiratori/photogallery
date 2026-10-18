---
name: verify-photogallery
description: Drive the photogallery local web UI and its media routes, capture proof, and tear the instance down. Use when changing the gallery page, viewer, media listing, or /media delivery and you need evidence from the running app.
---

# Verify photogallery

Photogallery is a local web gallery at `http://127.0.0.1:8797`. A user opens the page, sees uploaded photos and videos, and opens one in a dialog. The same server serves `GET /api/media` and `GET /media/<key>`. Production login is Cloudflare Access; this local server is the stand-in and does not show the Access wall.

Run every command from the repository root. The helper is `node .cursor/skills/verify-photogallery/scripts/verify.mjs`.

## Launch

Start one isolated instance. It creates an empty persist directory, seeds `verify.png` and `verify.mp4` into local R2 bucket `photogallery-media`, then starts `pnpm dev` on port `8797` with `PHOTOGALLERY_PERSIST` pointed at that directory.

```powershell
node .cursor/skills/verify-photogallery/scripts/verify.mjs launch
```

Ready means `GET /` returns 200 and the HTML contains `フォトギャラリー`, and the listener pid belongs to the recorded process tree. The command prints JSON with `url`, `pid`, `persist`, and `seeded: true`.

For the empty-gallery journey only:

```powershell
node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty
```

That instance has no objects. Do not use it for the seeded journeys.

Two verification instances must not share a persist directory. The helper keeps a single record at `.cursor/skills/verify-photogallery/runs/current.json` and refuses to launch while that pid is alive or while `127.0.0.1:8797` is taken. The user's `pnpm dev` on port `8787` uses `.wrangler/state` and is a different instance. Do not drive it, and do not set `PHOTOGALLERY_PERSIST` to `.wrangler/state`.

## Doctor

Run this first whenever the page, API, or process looks wrong.

```powershell
node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor
```

It is read-only. It passes only when the recorded pid is alive, that pid's tree owns port `8797`, the persist path is not `.wrangler/state`, `GET /` contains `フォトギャラリー` and `ローカルプレビュー`, and `GET /api/media` returns JSON. A seeded run must list `verify.png` and `verify.mp4`.

## Drive

Drive the UI in the browser and the HTTP routes with `curl.exe`. Stable handles are the heading text `フォトギャラリー`, `#status`, `#grid`, `button` whose accessible name is the image alt (`verify.png`), `dialog#viewer`, the button named `閉じる`, and `#caption`. Video tiles have no alt text; use the figcaption `verify.mp4`.

Wait until `#status` is no longer `読み込み中です。` The seeded status is `2 件`. The empty status is `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。`

Save proof under `.cursor/skills/verify-photogallery/artifacts/<feature-id>/`. Record the feature id and the entry point with the artifact.

HTTP checks, with `<url>` taken from the launch JSON:

```powershell
curl.exe -sS "<url>/api/media"
curl.exe -sS -D - -o NUL "<url>/media/verify.png"
curl.exe -sS -D - -o NUL -H "Range: bytes=0-15" "<url>/media/verify.png"
curl.exe -sS -D - -o NUL -H "Cf-Access-Authenticated-User-Email: verify@example.com" "<url>/"
curl.exe -sS -D - "<url>/missing"
```

Browser checks use the Cursor browser: open `<url>/`, snapshot, then click. Exercise the page a user sees. Do not call test-only endpoints. `GET /api/media` and `GET /media/*` are the production routes the page uses.

`verify.mp4` is 1024 bytes of non-decodable data with `video/mp4`. A video element and a `206` range response are observable. A moving picture is not, until a decodable file is seeded. Do not treat a failed decode as a passed playback journey.

## Evidence

Write artifacts under `.cursor/skills/verify-photogallery/artifacts/<feature-id>/`. Cleanup does not delete that directory.

- UI proof is an accessibility snapshot plus a screenshot that shows `フォトギャラリー` and the state after the action.
- HTTP proof is the status line, response headers, and body (or the first bytes for media).
- A gallery change is proven only when `/api/media` and the rendered `#status` agree.
- The local server does not perform Cloudflare Access. Sending `Cf-Access-Authenticated-User-Email` proves the heading only. It does not prove the Google login wall.

## Cleanup

Stop the process tree that launch recorded, then delete that run's directory and `runs/current.json`.

```powershell
node .cursor/skills/verify-photogallery/scripts/verify.mjs cleanup
```

The command uses `taskkill /PID <recorded-pid> /T /F`. It does not kill by process name. Proof files under `artifacts/` stay.

## Helpers

`node .cursor/skills/verify-photogallery/scripts/verify.mjs launch` starts and seeds the instance.

`node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty` starts an instance with no objects.

`node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` checks the recorded instance.

`node .cursor/skills/verify-photogallery/scripts/verify.mjs cleanup` stops that instance and removes its scratch state.

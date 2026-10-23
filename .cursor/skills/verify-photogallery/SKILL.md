---
name: verify-photogallery
description: Drive the photogallery local web UI and its media routes, capture proof, and tear the instance down. Use when changing the gallery page, viewer, media listing, or /media delivery and you need evidence from the running app.
---

# Verify photogallery

Photogallery is a local web gallery at `http://127.0.0.1:8797`. A user opens the page, sees uploaded photos and videos, and opens one in a dialog. The same server serves `GET /api/media` and `GET /media/<key>`. Production login is Cloudflare Access; this local server is the stand-in and does not show the Access wall.

Run every command from the repository root. The helper is `node .cursor/skills/verify-photogallery/scripts/verify.mjs`.

## Launch

Start one isolated instance. It creates an empty persist directory, seeds pairs for three years into local R2 bucket `photogallery-media`, then starts `pnpm dev` on port `8797` with `PHOTOGALLERY_PERSIST` pointed at that directory. 2024 has 65 pairs, more than one step of 60 tiles. The newest is `2024-08-02T12-00-00.png` with `t/2024-08-02T12-00-00.webp`; the other 64 are `2024-01-01T00-MM-SS.png`. 2023 has `2023-05-01T08-30-00.mp4` with `t/2023-05-01T08-30-00.webp`. 2022 has `2022-01-01T00-00-00.png` with `t/2022-01-01T00-00-00.webp`.

```powershell
node .cursor/skills/verify-photogallery/scripts/verify.mjs launch
```

Ready means `GET /` returns 200 and the HTML contains `フォトギャラリー`, and the listener pid belongs to the recorded process tree. The command prints JSON with `url`, `pid`, `persist`, and `seeded: true`. Seeded data includes 2024 (65 pairs), 2023 (1 video), 2022 (1 image), and `u-abc123def456.png` under 年不明.

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

It is read-only. It passes only when the recorded pid is alive, that pid's tree owns port `8797`, the persist path is not `.wrangler/state`, `GET /` contains `フォトギャラリー` and `ローカルプレビュー`, and `GET /api/media` returns `{ years }` with per-year `GET /api/media?year=…` contents. A seeded run must list body keys `2024-08-02T12-00-00.png`, `2023-05-01T08-30-00.mp4`, `2022-01-01T00-00-00.png`, and `u-abc123def456.png`.

## Drive

Drive the UI in the browser and the HTTP routes with `curl.exe`. Stable handles are the heading text `フォトギャラリー`, `#status`, `#year-list`, `#grid`, the year-screen heading `#grid`’s sibling `h2`, `button` whose accessible name is the image alt (`2024-08-02T12-00-00.png`), `dialog#viewer`, the button named `閉じる`, and `#caption`. Year-list cards live under `#year-list`. Every year-screen tile is an `img`. The video tile's alt and figcaption are `2023-05-01T08-30-00.mp4`. The dialog image or video uses the body URL.

`#status` exists only before the year list or year screen is ready: `読み込み中です。`, `一覧を取得できませんでした。`, or the empty sentence `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。` On the seeded instance, wait until `#status` is gone and year cards for 2024, 2023, 2022, and 年不明 are present with no `件` text. Open 2024 to see 60 tiles, then scroll for the rest of that year only.

Save proof under `.cursor/skills/verify-photogallery/artifacts/<feature-id>/`. Record the feature id and the entry point with the artifact.

HTTP checks, with `<url>` taken from the launch JSON:

```powershell
curl.exe -sS "<url>/api/media"
curl.exe -sS -D - -o NUL "<url>/media/2024-08-02T12-00-00.png"
curl.exe -sS -D - -o NUL -H "Range: bytes=0-15" "<url>/media/2023-05-01T08-30-00.mp4"
curl.exe -sS -D - -o NUL -H "Cf-Access-Authenticated-User-Email: verify@example.com" "<url>/"
curl.exe -sS -D - "<url>/missing"
```

Browser checks use the Cursor browser: open `<url>/`, snapshot, then click. Exercise the page a user sees. Do not call test-only endpoints. `GET /api/media` and `GET /media/*` are the production routes the page uses.

`2023-05-01T08-30-00.mp4` is 1024 bytes of non-decodable data with `video/mp4`. A video element and a `206` range response are observable. A moving picture is not, until a decodable file is seeded. Do not treat a failed decode as a passed playback journey. The seeded thumbnail is a WebP still, not a frame from that file.

## Evidence

Write artifacts under `.cursor/skills/verify-photogallery/artifacts/<feature-id>/`. Cleanup does not delete that directory.

- UI proof is an accessibility snapshot plus a screenshot that shows `フォトギャラリー` and the state after the action.
- HTTP proof is the status line, response headers, and body (or the first bytes for media).
- A gallery change is proven only when walking `/api/media` through `next` and the rendered year headings agree.
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

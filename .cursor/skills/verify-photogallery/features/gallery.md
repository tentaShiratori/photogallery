# Gallery

The gallery lists every image and video in local R2, newest upload first, and tells the user how many there are.

## Sub-features

- `gallery-seeded` shows `verify.png` and `verify.mp4` with status `2 件`.
- `gallery-empty` shows the empty-state sentence when the bucket has no media.
- `gallery-list` returns the same keys from `GET /api/media` that the grid renders.

## How to get to it (user POV)

- Open `http://127.0.0.1:8797/`.
- The page itself requests `GET /api/media` and fills `#grid`.

## Driving it with browser and curl

Preconditions:

- `node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` reports `seeded: true`, url `http://127.0.0.1:8797`, and keys `verify.png` and `verify.mp4`.
- For `gallery-empty` only, no seeded instance is running. Launch with `node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty` and doctor reports `seeded: false` and `keys` as `[]`.

- **Open the gallery.** Open the recorded URL. The heading reads `フォトギャラリー` and the secondary text reads `ローカルプレビュー`.
- **Wait for the list.** Wait until `#status` text is `2 件`. `#grid` contains a button named `verify.png` and a figcaption `verify.mp4`.
- **Confirm the list API.** Run `curl.exe -sS "http://127.0.0.1:8797/api/media"`. Status 200, `truncated` is false, and the body has `groups` with no top-level `items`. Flatten `groups[].items`. That list includes `verify.png` (`kind` `image`) and `verify.mp4` (`kind` `video`).
- **Empty gallery.** On the `--empty` instance, wait until `#status` is `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。` `#grid` has no buttons. `curl.exe -sS "http://127.0.0.1:8797/api/media"` returns `groups` as `[]`.
- **Proof.** Save the seeded state. Write an accessibility snapshot to `.cursor/skills/verify-photogallery/artifacts/gallery/seeded.aria.txt` and a screenshot to `.cursor/skills/verify-photogallery/artifacts/gallery/seeded.png`. Both show `フォトギャラリー`, `2 件`, and `verify.png`. Save the API body to `.cursor/skills/verify-photogallery/artifacts/gallery/api-media.json`.

## Gotchas

- The first HTML still contains `読み込み中です。` The grid is filled by client script after `GET /api/media`. Wait for `#status` to change.
- A failure of `GET /api/media` sets `#status` to `一覧を取得できませんでした。` That is not the empty state.
- Status gains `（上限で打ち切っています）` only when the list is truncated. The seeded bucket is not truncated.
- `gallery-empty` is a different instance. Do not delete objects from the seeded persist to imitate it.
- Order is upload time, then key. Assert the status count and the two names, not a fixed tile position.

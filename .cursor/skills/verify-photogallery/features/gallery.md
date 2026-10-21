# Gallery

The gallery lists each complete pair under a year heading taken from the body key, and tells the user how many there are. A pair is a body plus `t/{stem}.webp`. A body alone, or a thumbnail alone, is not listed. A body key that is not a capture time sits under 年不明.

## Sub-features

- `gallery-seeded` shows `2024-08-02T12-00-00.png` and `2023-05-01T08-30-00.mp4` with status `2 件`.
- `gallery-empty` shows the empty-state sentence when the bucket has no media.
- `gallery-list` returns the same body keys from `GET /api/media` that the grid renders.

## How to get to it (user POV)

- Open `http://127.0.0.1:8797/`.
- The page itself requests `GET /api/media` and fills `#grid`.

## Driving it with browser and curl

Preconditions:

- `node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` reports `seeded: true`, url `http://127.0.0.1:8797`, and body keys `2024-08-02T12-00-00.png` and `2023-05-01T08-30-00.mp4`.
- For `gallery-empty` only, no seeded instance is running. Launch with `node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty` and doctor reports `seeded: false` and `keys` as `[]`.

- **Open the gallery.** Open the recorded URL. The heading reads `フォトギャラリー` and the secondary text reads `ローカルプレビュー`.
- **Wait for the list.** Wait until `#status` text is `2 件`. `#grid` contains a button named `2024-08-02T12-00-00.png` and a figcaption `2023-05-01T08-30-00.mp4`.
- **Confirm the list API.** Run `curl.exe -sS "http://127.0.0.1:8797/api/media"`. Status 200, `truncated` is false, and the body has `groups` with no top-level `items`. Flatten `groups[].items`. That list includes `2024-08-02T12-00-00.png` (`kind` `image`, `bodyUrl` `/media/2024-08-02T12-00-00.png`, `thumbUrl` `/media/t/2024-08-02T12-00-00.webp`) and `2023-05-01T08-30-00.mp4` (`kind` `video`, `bodyUrl` `/media/2023-05-01T08-30-00.mp4`, `thumbUrl` `/media/t/2023-05-01T08-30-00.webp`).
- **Empty gallery.** On the `--empty` instance, wait until `#status` is `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。` `#grid` has no buttons. `curl.exe -sS "http://127.0.0.1:8797/api/media"` returns `groups` as `[]`.
- **Proof.** Save the seeded state. Write an accessibility snapshot to `.cursor/skills/verify-photogallery/artifacts/gallery/seeded.aria.txt` and a screenshot to `.cursor/skills/verify-photogallery/artifacts/gallery/seeded.png`. Both show `フォトギャラリー`, `2 件`, and `2024-08-02T12-00-00.png`. Save the API body to `.cursor/skills/verify-photogallery/artifacts/gallery/api-media.json`.

## Gotchas

- The first HTML still contains `読み込み中です。` The grid is filled by client script after `GET /api/media`. Wait for `#status` to change.
- A failure of `GET /api/media` sets `#status` to `一覧を取得できませんでした。` That is not the empty state.
- Status gains `（上限で打ち切っています）` only when the list is truncated and at least one pair was returned. The seeded bucket is not truncated. Zero pairs and `truncated: true` sets `#status` to `一覧が上限で止まりました。`
- `gallery-empty` is a different instance. Do not delete objects from the seeded persist to imitate it.
- Dated pairs sort by capture time, then upload time, then body key. Assert the status count and the two names, not a fixed tile position.
- Every tile is an `img`. The image `src` is `thumbUrl`. The button name is the body key.

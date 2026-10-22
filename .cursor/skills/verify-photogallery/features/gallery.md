# Gallery

The gallery lists each complete pair under a year heading taken from the body key, newest year first, with that year's count beside the heading. A pair is a body plus `t/{stem}.webp`. A body alone, or a thumbnail alone, is not listed. A body key that starts with `u-` sits under 年不明, last. Tiles appear 60 at a time. Reaching the bottom shows the next 60, and the next year is read only after the current one is fully shown.

## Sub-features

- `gallery-seeded` opens on the heading `2024 65 件` with 60 tiles and no `#status`, starting with `2024-08-02T12-00-00.png`.
- `gallery-scroll` reveals the other 5 tiles of 2024, then loads `2023 1 件` and `2022 1 件`.
- `gallery-more-failed` keeps the shown tiles and offers `もう一度` when a continuation fails.
- `gallery-empty` shows the empty-state sentence when the bucket has no media.
- `gallery-list` returns, one year per response, the same body keys the grid renders.

## How to get to it (user POV)

- Open `http://127.0.0.1:8797/`.
- The page itself requests `GET /api/media`, then each `next` while the bottom of the page is in view.

## Driving it with browser and curl

Preconditions:

- `node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` reports `seeded: true`, url `http://127.0.0.1:8797`, and body keys `2024-08-02T12-00-00.png`, `2023-05-01T08-30-00.mp4`, and `2022-01-01T00-00-00.png`.
- For `gallery-empty` only, no seeded instance is running. Launch with `node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty` and doctor reports `seeded: false` and `keys` as `[]`.

- **Open the gallery.** Open the recorded URL. The heading reads `フォトギャラリー` and the secondary text reads `ローカルプレビュー`.
- **Wait for the first year.** Wait until `#status` is gone. `#grid` has one heading, `2024 65 件`, and 60 tiles. The first tile is the button named `2024-08-02T12-00-00.png`. No `2023` heading is present yet.
- **Scroll.** Scroll to the bottom. `#grid` has 65 tiles and still one heading. Scroll to the bottom again. The headings become `2024 65 件`, `2023 1 件`, and `2022 1 件`, and `#grid` contains a figcaption `2023-05-01T08-30-00.mp4`. No `#more` is shown at the end.
- **Continuation failure.** In the browser, block requests to `/api/media?after=2024` (DevTools request blocking), reload, and scroll to the bottom twice. The 65 tiles stay, and `#more` shows `続きを取得できませんでした。` with the button `もう一度`. Unblock, click `もう一度`, and the `2023 1 件` heading appears.
- **Confirm the list API.** Run `curl.exe -sS "http://127.0.0.1:8797/api/media"`. Status 200, `cache-control` is `private, no-store`, the body has exactly `group` and `next`, `group.label` is `2024`, `group.truncated` is false, `group.items` has 65 entries, and `next` is `/api/media?after=2024`. Run `curl.exe -sS "http://127.0.0.1:8797/api/media?after=2024"`: `group.label` is `2023` with `2023-05-01T08-30-00.mp4` (`kind` `video`, `bodyUrl` `/media/2023-05-01T08-30-00.mp4`, `thumbUrl` `/media/t/2023-05-01T08-30-00.webp`). Follow `next` until it is null.
- **Empty gallery.** On the `--empty` instance, wait until `#status` is `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。` `#grid` has no buttons. `curl.exe -sS "http://127.0.0.1:8797/api/media"` returns `{"group":null,"next":null}`.
- **Proof.** Save the first-year state and the failure state. Write accessibility snapshots and screenshots to `.cursor/skills/verify-photogallery/artifacts/gallery/seeded.aria.txt`, `seeded.png`, and `more-failed.png`. The seeded ones show `フォトギャラリー`, `2024 65 件`, and `2024-08-02T12-00-00.png`. Save each API body to `.cursor/skills/verify-photogallery/artifacts/gallery/api-media-<step>.json`.

## Gotchas

- The first HTML still contains `読み込み中です。` The grid is filled by client script after `GET /api/media`. Wait for `#status` to disappear.
- A first-response failure sets `#status` to `一覧を取得できませんでした。` with no tiles. That is not the empty state, and it has no `もう一度`.
- A short page fetches the next year on its own, because the bottom is already in view. Use a window tall enough to show less than 60 tiles when proving that older years are not read on open.
- A year whose bodies have no thumbnails answers `group: null` with a `next`. It shows no heading and the page moves on.
- A year that hit the 20,000-object cap shows `（上限で打ち切っています）` after its count. The seeded bucket is not capped.
- `gallery-empty` is a different instance. Do not delete objects from the seeded persist to imitate it.
- Dated pairs sort by capture time, then upload time, then body key. Assert the headings, counts, and the first tile name, not other fixed tile positions.
- Every tile is an `img`. The image `src` is `thumbUrl`. The button name is the body key.

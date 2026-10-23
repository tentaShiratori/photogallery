# Gallery

The gallery has two screens. The year list shows each year that has a complete pair (body plus `t/{stem}.webp`), newest year first, with 「年不明」 last when present. Each year card shows up to four preview thumbnails in name order (ascending body key). Choosing a year or a preview opens the year screen for that year only. The year screen shows tiles 60 at a time and does not load another year. 「N 件」 is never shown. A truncated year shows 「（上限で打ち切っています）」 beside the year heading on the year screen only.

## Sub-features

- `gallery-year-list` opens on year cards for 2024, 2023, 2022, and 年不明, with no `#status` and no 「N 件」.
- `gallery-year-screen` opens `/?year=2024` with heading `2024`, 60 tiles, and no other year. Scrolling reveals the remaining 2024 tiles and stops.
- `gallery-year-unknown` opens `/?year=unknown` and shows the 年不明 heading with its tiles.
- `gallery-back` returns from the year screen to the year list at the prior scroll position.
- `gallery-empty` shows the empty-state sentence when the bucket has no media.
- `gallery-list` returns the year list JSON from `GET /api/media` and one year from `GET /api/media?year=…`.

## How to get to it (user POV)

- Open `http://127.0.0.1:8797/`.
- The page requests `GET /api/media` for the year list. Opening a year requests `GET /api/media?year=2024` (or `year=unknown`).

## Driving it with browser and curl

Preconditions:

- `node .cursor/skills/verify-photogallery/scripts/verify.mjs doctor` reports `seeded: true`, url `http://127.0.0.1:8797`, and body keys that include `2024-08-02T12-00-00.png`, `2023-05-01T08-30-00.mp4`, `2022-01-01T00-00-00.png`, and at least one `u-…` unknown-year body.
- For `gallery-empty` only, launch with `node .cursor/skills/verify-photogallery/scripts/verify.mjs launch --empty` and doctor reports `seeded: false`.

- **Open the year list.** Open the recorded URL with no `year` query. The heading reads `フォトギャラリー` and the secondary text reads `ローカルプレビュー`. Wait until `#status` is gone. Year cards for `2024`, `2023`, `2022`, and `年不明` are present. `年不明` is last. No text `件` appears. A year with fewer than four media shows only that many previews.
- **Open a year.** Click the `2024` card (or one of its previews). The URL contains `year=2024`. The year screen shows `← 年の一覧へ` and heading `2024` with 60 tiles. The first tile is the button named `2024-08-02T12-00-00.png`. No `2023` heading is present.
- **Scroll within the year.** Scroll to the bottom. More 2024 tiles appear until 65. Further scrolling does not add 2023 or 2022.
- **Back.** Click `← 年の一覧へ` or use the browser Back control. The year list returns. Scroll position matches where you left it when possible.
- **Deep link.** Open `/?year=unknown`. The year screen for 年不明 appears after load.
- **Confirm the list API.** `curl.exe -sS "http://127.0.0.1:8797/api/media"` returns `{ years: [...] }` with labels `2024`, `2023`, `2022`, and `年不明` last. Each entry has `previews` of length at most 4. `curl.exe -sS "http://127.0.0.1:8797/api/media?year=2024"` returns `{ group, next: null }` with `group.label` `2024` and 65 items. `curl.exe -sS "http://127.0.0.1:8797/api/media?year=unknown"` returns the unknown-year group.
- **Empty gallery.** On the `--empty` instance, wait until `#status` is `まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。` `GET /api/media` returns `{ "years": [] }`.
- **Proof.** Save year-list and year-screen screenshots under `.cursor/skills/verify-photogallery/artifacts/gallery/`. Save API bodies as `api-media-years.json` and `api-media-year-2024.json`.

## Gotchas

- The first HTML still contains `読み込み中です。` The year list is filled by client script after `GET /api/media`. Wait for `#status` to disappear.
- A first-response failure sets `#status` to `一覧を取得できませんでした。` with no cards. That is not the empty state, and it has no `もう一度`.
- Year-list previews are name-ascending. Year-screen tiles are capture-descending. Do not expect the first preview to match the first year-screen tile.
- Clicking a preview on the year list opens the year screen, not the enlarged view.
- `gallery-empty` is a different instance. Do not delete objects from the seeded persist to imitate it.
- Every year-screen tile is an `img`. The image `src` is `thumbUrl`. The button name is the body key.

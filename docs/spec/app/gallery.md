# Gallery

Terms are in [GLOSSARY.md](../../../GLOSSARY.md).

## R-GAL-01 Sort order

- Among years, newer years come first. 「年不明」 is last. Years with no media have no heading. Which year an item belongs to is in [R-MEDIA-02](../domain/media.md#r-media-02-how-the-year-is-decided).
- A year heading appears with that year's first tile. The 「年不明」 heading appears with its first tile.
- Within a year, newer capture date-time comes first. On the same second, newer upload time comes first. If still tied, the earlier name in lexicographic order comes first. Example: `2024-08-02T12-00-00-2.jpg` comes before `2024-08-02T12-00-00.jpg`.
- In 「年不明」, newer upload time comes first. If still tied, the earlier name in lexicographic order comes first.
- Even when tiles are shown 60 at a time, they keep the full sort order for that year's media.

## R-GAL-02 List limit

- When bodies and thumbnails for a year or 「年不明」 total more than 20,000, the list stops at the limit.
- Bodies and thumbnails for that year are visited in equal alternating counts, up to 20,000 combined. When more remain after 20,000, the list for that year stops.
- When at least one media item is visible, 「（上限で打ち切っています）」 follows the count next to that year's heading. Example: 「10000 件（上限で打ち切っています）」. Only the visible tiles are shown.
- When no media items are visible, that year has no heading. The list for the next year is fetched instead.

## R-GAL-03 List API shape

- The JSON has `group` and `next`. One response covers bodies and thumbnails for one year only.
- `/api/media` is for the newest year. `/api/media?after=year` is for the newest year older than that year. When that year has no media, both use the 「年不明」 slice.
- `group` has `label`, `truncated`, and `items`. For a year, `label` is the year digits ([R-MEDIA-02](../domain/media.md#r-media-02-how-the-year-is-decided)). For 「年不明」, `label` is 「年不明」. `truncated` is true when the [R-GAL-02](#r-gal-02-list-limit) limit stopped the list. `items` has one or more entries in [R-GAL-01](#r-gal-01-sort-order) order. That count is the count next to the heading.
- When that slice has no media, `group` is null.
- Each `items` element has `bodyKey` (body name), `kind` (`image` or `video`), `bodyUrl` (body delivery), `thumbUrl` (thumbnail delivery), and `caption` (body name).
- `next` is the continuation URL. For a year slice it is `/api/media?after=that year`. For 「年不明」 it is null.
- `Cache-Control` is `private, no-store`.
- When `after` is not a number from 1 through 9999 without leading zeros, the status is 400. The body is 「after が年ではありません。」.
- When scanning names in batches of 1,000 up to 20 times still finds names that start with digits while searching for a year, the status is 500.

## R-GAL-04 Serve content

- When an image or video with that name is stored, the status is 200. The response body is those bytes.
- The URL is `/media/` followed by the name. Names with folder separators keep the separators. Spaces and `#` are percent-encoded in the URL.
- `Content-Type` is the value stored at upload if present. Otherwise it follows the extension. jpg and jpeg are `image/jpeg`, png is `image/png`, gif is `image/gif`, webp is `image/webp`, avif is `image/avif`, heic is `image/heic`, heif is `image/heif`, mp4 is `video/mp4`, mov is `video/quicktime`, webm is `video/webm`, and m4v is `video/x-m4v`.
- `Accept-Ranges` is `bytes`.
- `Cache-Control` is `private, max-age=3600`.
- Undeliverable paths are in [R-GAL-07](#r-gal-07-reject-undeliverable-paths). Ranges are in [R-GAL-05](#r-gal-05-serve-ranges).

## R-GAL-05 Serve ranges

- When an image or video with that name is stored, the same URL accepts a `Range` request.
- For `Range: bytes=start-end`, the status is 206. The response body is the inclusive byte range. `Content-Range` is `bytes start-end/total length`. Example: length 1024 and `bytes=0-99` yield `bytes 0-99/1024` and 100 bytes.
- For `Range: bytes=-length`, the status is 206. The response body is the last `length` bytes. Example: length 1024 and `bytes=-50` yield `bytes 974-1023/1024` and 50 bytes.

## R-GAL-06 Serve HEIC and HEIF

- When a HEIC or HEIF image is stored, the bytes are served as in [R-GAL-04](#r-gal-04-serve-content). `Content-Type` follows the same rules as [R-GAL-04](#r-gal-04-serve-content).
- When that image is viewed in a gallery tile, or when bytes are fetched via [R-GAL-04](#r-gal-04-serve-content), the browser receives the bytes.
- On Windows browsers, the image often does not render.

## R-GAL-07 Reject undeliverable paths

- For paths under `/media/`, when the path is empty, contains `..`, contains `\`, starts with `/`, contains an empty segment, has a broken `%`, has an extension that is neither image nor video, or names something not stored, the status is 404. The body is 「見つかりません。」.
- An extension that is neither image nor video yields 404 even when bytes are stored.

## R-GAL-08 Reject unknown locations

- For locations other than `/`, `/api/media`, `/media/`, and the tab mark, the status is 404. The body is 「見つかりません。」.

## R-GAL-09 Keep out of search results

- The gallery page is marked so it does not appear in search results.

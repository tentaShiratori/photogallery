# Gallery

Terms are in [GLOSSARY.md](../../../GLOSSARY.md).

## R-GAL-01 Sort order

- Among years, newer years come first; 「年不明」 is last. Years without media have no heading. Which year an item belongs to is in [R-MEDIA-02](../domain/media.md#r-media-02-how-the-year-is-decided).
- A year heading appears with that year's first tile. The 「年不明」 heading appears with its first tile.
- Within a year, newer capture date-time comes first. Same second: newer upload time first. Same again: earlier name in lexicographic order. Example: `2024-08-02T12-00-00-2.jpg` comes before `2024-08-02T12-00-00.jpg`.
- In 「年不明」, newer upload time comes first. Same again: earlier name in lexicographic order.
- Showing tiles 60 at a time preserves the full sort order for that year's media.

## R-GAL-02 List limit

- When bodies and thumbnails for a year or 「年不明」 total more than 20,000, the list stops at the limit.
- Bodies and thumbnails for that year are visited alternately in equal counts, up to 20,000 combined. When more remain after 20,000, the list for that year stops.
- When at least one media item is visible, the count beside that year's heading is followed by 「（上限で打ち切っています）」. Example: 「10000 件（上限で打ち切っています）」. Tiles show only the visible portion.
- When zero media items are visible, that year has no heading. Fetch the list for the next year.

## R-GAL-03 List API shape

- JSON has `group` and `next`. One response covers bodies and thumbnails for one year only.
- `/api/media` is for the newest year. `/api/media?after=year` is for the newest year older than that year. When that year has no media, both use the 「年不明」 slice.
- `group` has `label`, `truncated`, and `items`. For a year, `label` is the year digits ([R-MEDIA-02](../domain/media.md#r-media-02-how-the-year-is-decided)); for 「年不明」, `label` is 「年不明」. `truncated` is true when stopped by the [R-GAL-02](#r-gal-02-list-limit) limit. `items` has one or more entries in [R-GAL-01](#r-gal-01-sort-order) order; the count matches the heading count.
- When that slice has no media, `group` is null.
- Each `items` element has `bodyKey` (body name), `kind` (`image` or `video`), `bodyUrl` (body delivery), `thumbUrl` (thumbnail delivery), and `caption` (body name).
- `next` is the continuation URL: for a year slice `/api/media?after=that year`; for 「年不明」, null.
- `Cache-Control` is `private, no-store`.
- When `after` is not a number from 1 through 9999 without leading zeros, status is 400. The body is 「after が年ではありません。」.
- When scanning names in batches of 1,000 up to 20 times still finds names starting with digits while searching for a year, status is 500.

## R-GAL-04 Serve content

- When an image or video with that name is stored, status is 200. The body is those bytes.
- The URL is `/media/` followed by the name. Names with folder separators keep the separators. Spaces and `#` are percent-encoded in the URL.
- `Content-Type` is the value stored at upload if present; otherwise it follows the extension. jpg and jpeg are `image/jpeg`, png `image/png`, gif `image/gif`, webp `image/webp`, avif `image/avif`, heic `image/heic`, heif `image/heif`, mp4 `video/mp4`, mov `video/quicktime`, webm `video/webm`, m4v `video/x-m4v`.
- `Accept-Ranges` is `bytes`.
- `Cache-Control` is `private, max-age=3600`.
- Undeliverable paths are in [R-GAL-07](#r-gal-07-reject-undeliverable-paths). Ranges are in [R-GAL-05](#r-gal-05-serve-ranges).

## R-GAL-05 Serve ranges

- When an image or video with that name is stored, the same URL accepts a `Range` request.
- For `Range: bytes=start-end`, status is 206. The body is the inclusive byte range. `Content-Range` is `bytes start-end/total length`. Example: length 1024, `bytes=0-99` yields `bytes 0-99/1024` and 100 bytes.
- For `Range: bytes=-length`, status is 206. The body is the last `length` bytes. Example: length 1024, `bytes=-50` yields `bytes 974-1023/1024` and 50 bytes.

## R-GAL-06 Serve HEIC and HEIF

- When a HEIC or HEIF image is stored, bytes are served as in [R-GAL-04](#r-gal-04-serve-content). `Content-Type` follows the same rules as [R-GAL-04](#r-gal-04-serve-content).
- When viewing that image in a gallery tile or fetching bytes via [R-GAL-04](#r-gal-04-serve-content), the browser receives the bytes.
- On Windows browsers, the image often does not render.

## R-GAL-07 Reject undeliverable paths

- For paths under `/media/`, when the path is empty, contains `..`, contains `\`, starts with `/`, contains an empty segment, has a broken `%`, has a non-image non-video extension, or names something not stored, status is 404. The body is 「見つかりません。」.
- A non-image non-video extension yields 404 even when bytes are stored.

## R-GAL-08 Reject unknown locations

- For locations other than `/`, `/api/media`, `/media/`, and the tab mark, status is 404. The body is 「見つかりません。」.

## R-GAL-09 Keep out of search results

- The gallery page has a directive to keep it out of search results.

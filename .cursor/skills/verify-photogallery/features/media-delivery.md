# Media delivery

Choosing a video opens the body in the viewer. The tile shows the thumbnail. The media URL answers a byte range so playback can seek.

## Sub-features

- `media-image` returns `2024-08-02T12-00-00.png` as `image/png`.
- `media-video-tile` shows `2023-05-01T08-30-00.mp4` as an image tile and opens a video element for the body.
- `media-range` answers `Range: bytes=0-15` with status 206.
- `media-missing` answers an unknown path with 404 and `見つかりません。`

## How to get to it (user POV)

- On the gallery, choose the tile captioned `2023-05-01T08-30-00.mp4`.
- The viewer loads `/media/2023-05-01T08-30-00.mp4`.
- Seeking sends a `Range` request to that URL.
- A bad address shows `見つかりません。`

## Driving it with browser and curl

Preconditions:

- Doctor reports the seeded instance at `http://127.0.0.1:8797` with body keys `2024-08-02T12-00-00.png` and `2023-05-01T08-30-00.mp4`.
- The headings `2024 65 件` and, after scrolling to the bottom twice, `2023 1 件` are shown.

- **Image bytes.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/media-delivery/body.png "http://127.0.0.1:8797/media/2024-08-02T12-00-00.png"`. Status 200, `content-type` is `image/png`, and `accept-ranges` is `bytes`.
- **Video tile.** In the browser, find the figcaption `2023-05-01T08-30-00.mp4`. Its tile contains an `img`, not a `video`. Click the button named `2023-05-01T08-30-00.mp4`. `dialog#viewer` contains a `video` whose `src` ends with `/media/2023-05-01T08-30-00.mp4`, and `#caption` reads `2023-05-01T08-30-00.mp4`.
- **Range.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/media-delivery/range.bin -H "Range: bytes=0-15" "http://127.0.0.1:8797/media/2023-05-01T08-30-00.mp4"`. Status 206 and `content-range` is `bytes 0-15/1024`.
- **Missing object.** Run `curl.exe -sS -D - "http://127.0.0.1:8797/media/missing.png"`. Status 404 and the body is `見つかりません。`
- **Unknown page.** Run `curl.exe -sS -D - "http://127.0.0.1:8797/missing"`. Status 404 and the body is `見つかりません。`
- **Thumbnail bytes.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/media-delivery/thumb.webp "http://127.0.0.1:8797/media/t/2023-05-01T08-30-00.webp"`. Status 200 and `content-type` is `image/webp`.
- **Proof.** Save the range headers to `.cursor/skills/verify-photogallery/artifacts/media-delivery/range.txt` and a screenshot of the open video dialog to `.cursor/skills/verify-photogallery/artifacts/media-delivery/video.png`. The screenshot shows `2023-05-01T08-30-00.mp4`.

## Gotchas

- `2023-05-01T08-30-00.mp4` is 1024 non-decodable bytes stored as `video/mp4`. The thumbnail is a WebP still made from the seeded PNG, not a decoded frame of that file. The video element and the 206 response are the proof. A moving picture is not available from this fixture.
- The video button is named `2023-05-01T08-30-00.mp4` because the tile is an `img` with that alt text.
- `GET /media/2024-08-02T12-00-00.png` without `Range` returns 200. A missing `content-range` on that response is expected.
- HEIC and HEIF can be stored and still fail to paint in Windows browsers. This map does not seed those types.

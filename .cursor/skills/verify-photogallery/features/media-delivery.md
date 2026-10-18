# Media delivery

Choosing a video opens it in the viewer, and the media URL answers a byte range so playback can seek.

## Sub-features

- `media-image` returns `verify.png` as `image/png`.
- `media-video-tile` shows `verify.mp4` as a video tile and opens a video element.
- `media-range` answers `Range: bytes=0-15` with status 206.
- `media-missing` answers an unknown path with 404 and `見つかりません。`

## How to get to it (user POV)

- On the gallery, choose the tile captioned `verify.mp4`.
- The viewer loads `/media/verify.mp4`.
- Seeking sends a `Range` request to that URL.
- A bad address shows `見つかりません。`

## Driving it with browser and curl

Preconditions:

- Doctor reports the seeded instance at `http://127.0.0.1:8797` with keys `verify.png` and `verify.mp4`.
- `#status` is `2 件`.

- **Image bytes.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/media-delivery/verify.png "http://127.0.0.1:8797/media/verify.png"`. Status 200, `content-type` is `image/png`, and `accept-ranges` is `bytes`.
- **Video tile.** In the browser, find the figcaption `verify.mp4`. Its tile contains a `video` element, not an `img`. Activate that tile's button. `dialog#viewer` contains a `video` whose `src` ends with `/media/verify.mp4`, and `#caption` reads `verify.mp4`.
- **Range.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/media-delivery/range.bin -H "Range: bytes=0-15" "http://127.0.0.1:8797/media/verify.mp4"`. Status 206 and `content-range` is `bytes 0-15/1024`.
- **Missing object.** Run `curl.exe -sS -D - "http://127.0.0.1:8797/media/missing.png"`. Status 404 and the body is `見つかりません。`
- **Unknown page.** Run `curl.exe -sS -D - "http://127.0.0.1:8797/missing"`. Status 404 and the body is `見つかりません。`
- **Proof.** Save the range headers to `.cursor/skills/verify-photogallery/artifacts/media-delivery/range.txt` and a screenshot of the open video dialog to `.cursor/skills/verify-photogallery/artifacts/media-delivery/video.png`. The screenshot shows `verify.mp4`.

## Gotchas

- `verify.mp4` is 1024 non-decodable bytes stored as `video/mp4`. The video element and the 206 response are the proof. A decoded frame is not available from this fixture. If the journey needs a moving picture, stop and report that the fixture cannot decode.
- The video button has no accessible name. Do not click a button named `verify.mp4`. Use the tile whose figcaption is `verify.mp4`.
- `GET /media/verify.png` without `Range` returns 200. A missing `content-range` on that response is expected.
- HEIC and HEIF can be stored and still fail to paint in Windows browsers. This map does not seed those types.

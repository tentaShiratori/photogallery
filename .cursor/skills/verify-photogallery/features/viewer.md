# Viewer

The viewer opens the body the user chose, shows the body key, and closes back to the grid.

## Sub-features

- `viewer-open` opens `2024-08-02T12-00-00.png` in the dialog.
- `viewer-caption` shows the body key under the image.
- `viewer-close` returns to the grid with the dialog closed.

## How to get to it (user POV)

- On the gallery, choose the `2024-08-02T12-00-00.png` tile.

## Driving it with browser and curl

Preconditions:

- Doctor reports the seeded instance at `http://127.0.0.1:8797`.
- The heading `2024 65 件` and a button named `2024-08-02T12-00-00.png` are present.

- **Open the photo.** Choose the `2024-08-02T12-00-00.png` tile. Click the button named `2024-08-02T12-00-00.png`. `dialog#viewer` is open, `#stage img` has alt `2024-08-02T12-00-00.png`, `#stage img` `src` ends with `/media/2024-08-02T12-00-00.png`, and `#caption` reads `2024-08-02T12-00-00.png`.
- **Confirm the bytes behind the image.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/viewer/body.png "http://127.0.0.1:8797/media/2024-08-02T12-00-00.png"`. Status 200 and `content-type` is `image/png`. The saved file starts with the PNG signature.
- **Close the dialog.** Choose `閉じる`. Click the button named `閉じる`. The dialog is closed and the button named `2024-08-02T12-00-00.png` is still in `#grid`.
- **Proof.** While the dialog is open, write an accessibility snapshot to `.cursor/skills/verify-photogallery/artifacts/viewer/open.aria.txt` and a screenshot to `.cursor/skills/verify-photogallery/artifacts/viewer/open.png`. Both show `フォトギャラリー` and `2024-08-02T12-00-00.png`.

## Gotchas

- The dialog starts closed. A snapshot taken before the click does not prove the viewer.
- The tile `src` is the thumbnail URL. The dialog image `src` is the body URL. Assert `#caption` and the dialog `src`.
- Opening `2023-05-01T08-30-00.mp4` is the media-delivery journey.
- Closing is the button named `閉じる`. Pressing Escape may also close the native dialog. The mapped action is the button.

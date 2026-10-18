# Viewer

The viewer opens the photo the user chose, shows the file name, and closes back to the grid.

## Sub-features

- `viewer-open` opens `verify.png` in the dialog.
- `viewer-caption` shows the file name under the image.
- `viewer-close` returns to the grid with the dialog closed.

## How to get to it (user POV)

- On the gallery, choose the `verify.png` tile.

## Driving it with browser and curl

Preconditions:

- Doctor reports the seeded instance at `http://127.0.0.1:8797`.
- `#status` is `2 件` and a button named `verify.png` is present.

- **Open the photo.** Choose the `verify.png` tile. Click the button named `verify.png`. `dialog#viewer` is open, `#stage img` has alt `verify.png`, and `#caption` reads `verify.png`.
- **Confirm the bytes behind the image.** Run `curl.exe -sS -D - -o .cursor/skills/verify-photogallery/artifacts/viewer/verify.png "http://127.0.0.1:8797/media/verify.png"`. Status 200 and `content-type` is `image/png`. The saved file starts with the PNG signature.
- **Close the dialog.** Choose `閉じる`. Click the button named `閉じる`. The dialog is closed and the button named `verify.png` is still in `#grid`.
- **Proof.** While the dialog is open, write an accessibility snapshot to `.cursor/skills/verify-photogallery/artifacts/viewer/open.aria.txt` and a screenshot to `.cursor/skills/verify-photogallery/artifacts/viewer/open.png`. Both show `フォトギャラリー` and `verify.png`.

## Gotchas

- The dialog starts closed. A snapshot taken before the click does not prove the viewer.
- The image alt and the caption both use the file name. Assert `#caption`, not only the thumbnail.
- Video tiles do not use this button name. Opening `verify.mp4` is the media-delivery journey.
- Closing is the button named `閉じる`. Pressing Escape may also close the native dialog; the mapped action is the button.

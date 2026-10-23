# UC-01 View gallery

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-01
- Name: View gallery
- Primary actor: User
- Preconditions: None
- Related: R-MEDIA-02 is how the year is decided. R-GAL-01 is sort order. R-GAL-02 is list limit. R-GAL-03 is list API shape. R-GAL-09 is keep out of search results. Local preview without a login email is [UC-L-01](../spec-local/UC-L-01-view-gallery-locally.md).
- Postconditions (success):
  - The tab shows the tab mark.
  - The text next to the heading is the login email address. `<`, `>`, `&`, `'`, and `"` appear as literal characters.
  - When there is at least one media item, tiles for the first year that has media are shown. 「N 件」 appears next to that year's heading. Thumbnails are shown. The accessible name is the body name. Thumbnails are selectable.
  - When the tiles do not reach the bottom of the viewport, more tiles appear without the user scrolling.
  - After more tiles appear, if more remain, the number of tiles has increased.
  - When tiles for a new year appear, 「N 件」 appears next to that year's heading.
  - When the added tiles still do not reach the bottom of the viewport, more keep appearing without the user scrolling until they reach the bottom or everything is shown.
  - When everything was already shown, no tiles or messages are added.
  - When there are no images or videos, 「まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。」 is shown.
- Postconditions (failure):
  - When the first list cannot be fetched, 「一覧を取得できませんでした。」 is shown. No tiles are shown.
  - When a later list cannot be fetched, the tiles already shown remain. 「続きを取得できませんでした。」 and 「もう一度」 are shown.

### Flow

1. The user opens the gallery.
2. The browser sets the tab title to 「フォトギャラリー」.
3. The browser sets the heading to 「フォトギャラリー」.
4. The browser shows the login email address as the login label next to the heading.
5. The browser puts the tab mark on the tab.
6. The browser shows 「読み込み中です。」.
7. The browser fetches lists in R-GAL-03 shape, one year at a time in R-GAL-01 order, through the first year that has media.
   - 7a. No year and no 「年不明」 has media.
     1. The browser hides 「読み込み中です。」.
     2. The browser shows 「まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。」.
   - 7e. The list cannot be fetched.
     1. The browser hides 「読み込み中です。」.
     2. The browser shows 「一覧を取得できませんでした。」.
8. The browser hides 「読み込み中です。」.
9. The browser shows that year's heading with 「N 件」.
10. The browser shows that year's media as tiles in R-GAL-01 order. Thumbnails are shown. The accessible name is the body name.
    - 10a. The tiles do not reach the bottom of the viewport.
      1. The browser shows more without the user scrolling.
11. The user scrolls to the bottom of the viewport.
    - 11a. Some tiles have not been shown yet.
      1. The browser shows more tiles.
12. The browser fetches lists in R-GAL-03 shape, one year at a time in R-GAL-01 order, through the next year that has media.
    - 12e. The list cannot be fetched.
      1. The browser shows 「続きを取得できませんでした。」 and 「もう一度」.
      - 12e-a. The user chooses 「もう一度」.
        1. The browser hides 「続きを取得できませんでした。」 and 「もう一度」.
        2. The browser fetches lists again, one year at a time from the failed year through the next year that has media.
        3. The browser shows that year's heading with 「N 件」.
        4. The browser shows that year's tiles.
13. The browser shows that year's heading with 「N 件」.
14. The browser shows that year's tiles.

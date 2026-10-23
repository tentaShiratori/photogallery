# UC-L-01 View gallery locally

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-L-01
- Name: View gallery locally
- Primary actor: User
- Preconditions: There is no login email (local gallery without Access).
- Related: R-MEDIA-02 is how the year is decided. R-GAL-01 is sort order. R-GAL-02 is list limit. R-GAL-03 is list API shape. R-GAL-10 is year-list previews. R-GAL-09 is keep out of search results. Production login label is [UC-01](../spec/UC-01-view-gallery.md).
- Postconditions (success):
  - The tab shows the tab mark.
  - The text next to the heading is 「ローカルプレビュー」.
  - When the gallery opens with no year in the URL and there is at least one media item, the year list is shown. Each year that has media appears as a card with its label and up to four thumbnails. 「年不明」 is last when it has media. Thumbnails on the year list are not an enlarged view.
  - When the user opens a year from the year list, the URL holds that year, and the year screen shows that year's tiles only. Thumbnails are selectable for the enlarged view. The accessible name is the body name.
  - When the year was truncated by the list limit, 「（上限で打ち切っています）」 appears next to the year heading. 「N 件」 does not appear.
  - When the tiles on the year screen do not reach the bottom of the viewport, more tiles of that year appear without the user scrolling.
  - After more tiles appear, if more of that year remain, the number of tiles has increased. When that year is fully shown, no further years are loaded.
  - When the user returns to the year list from the year screen, the year list is at the scroll position left before opening the year.
  - When the URL already holds a year and that year has media, the year screen for that year is shown after reload.
  - When there are no images or videos, 「まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。」 is shown.
- Postconditions (failure):
  - When the year list cannot be fetched, 「一覧を取得できませんでした。」 is shown. No year cards are shown.
  - When the year screen's list cannot be fetched, 「一覧を取得できませんでした。」 is shown. No tiles are shown.

### Flow

1. The user opens the local gallery with no year in the URL.
   - 1a. The URL already holds a year.
     1. After the shell in steps 2 through 5, the browser opens that year's year screen from step 12.
2. The browser sets the tab title to 「フォトギャラリー」.
3. The browser sets the heading to 「フォトギャラリー」.
4. The browser shows 「ローカルプレビュー」 as the login label next to the heading.
5. The browser puts the tab mark on the tab.
6. The browser shows 「読み込み中です。」.
7. The browser fetches the year list in R-GAL-03 shape.
   - 7a. No year and no 「年不明」 has media.
     1. The browser hides 「読み込み中です。」.
     2. The browser shows 「まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。」.
   - 7e. The year list cannot be fetched.
     1. The browser hides 「読み込み中です。」.
     2. The browser shows 「一覧を取得できませんでした。」.
8. The browser hides 「読み込み中です。」.
9. The browser shows the year list. Each year card shows the year label and up to four thumbnails per R-GAL-10. 「年不明」 is last when present.
10. The user chooses a year or a thumbnail on that year's card.
11. The browser puts that year in the URL and opens the year screen.
12. The browser shows 「読み込み中です。」.
13. The browser fetches that year's list in R-GAL-03 shape.
    - 13e. The list cannot be fetched.
      1. The browser hides 「読み込み中です。」.
      2. The browser shows 「一覧を取得できませんでした。」.
14. The browser hides 「読み込み中です。」.
15. The browser shows a link 「← 年の一覧へ」 and the year heading. When the year is truncated per R-GAL-02, 「（上限で打ち切っています）」 follows the heading.
16. The browser shows that year's media as tiles in R-GAL-01 order. Thumbnails are shown. The accessible name is the body name.
    - 16a. The tiles do not reach the bottom of the viewport.
      1. The browser shows more of that year without the user scrolling.
17. The user scrolls to the bottom of the viewport.
    - 17a. Some tiles of that year have not been shown yet.
      1. The browser shows more tiles of that year.
18. The user chooses 「← 年の一覧へ」 or uses the browser Back control.
19. The browser shows the year list at the scroll position left before step 10.

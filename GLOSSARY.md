# Photo Gallery (フォトギャラリー)

A collection of images and videos that only a limited set of people can view.

## Screen

**Gallery (ギャラリー)**:
The screen that lists media grouped by the year it was captured.
_Avoid_: album, library, feed

**Tab mark (タブの印)**:
The wordless colored ring flower shown on the gallery tab.
_Avoid_: favicon, icon

**Tile (タイル)**:
One slot in the gallery for a single piece of media.
_Avoid_: card

**Enlarged view (拡大表示)**:
The screen that shows the body of one selected item large.
_Avoid_: viewer, lightbox, dialog, modal

**Login label (ログイン表示)**:
The label beside the gallery heading that shows who is viewing.
_Avoid_: username, profile

**Local preview (ローカルプレビュー)**:
The text beside the heading when there is no login email.
_Avoid_: dev mode, logged out, guest

**Unknown year (年不明)**:
The heading used for media whose capture date-time year cannot be determined.
_Avoid_: uncategorized, other

## Time

**Capture date-time (撮影日時)**:
The calendar date and time when an image or video was captured, including seconds.
_Avoid_: EXIF, timestamp, DateTimeOriginal, uploaded

**Creation date-time (作成日時)**:
The calendar date and time recorded inside a video file as when that file was created.
_Avoid_: modification date-time

**Android mark (Android の印)**:
That a video contains fields the Android device added.
_Avoid_: com.android, manufacturer, model, capture.fps

**Modification date-time (更新日時)**:
The calendar date and time when the file on disk was last updated.
_Avoid_: mtime

**Upload time (アップロード時刻)**:
The time when an image or video was placed in storage.

## Content

**Media (メディア)**:
An image or video counted as one gallery item when body and thumbnail are both present. Either alone is not media.
_Avoid_: file, object

**Image (画像)**:
Still media. Extensions are jpg, jpeg, png, gif, webp, avif, heic, heif.
_Avoid_: photo

**Video (動画)**:
Moving media. Extensions are mp4, mov, webm, m4v.
_Avoid_: clip, movie

**Body (本体)**:
The full image or video of a media item. Used in the enlarged view.
_Avoid_: original, source

**Thumbnail (サムネイル)**:
A small still image made from media for the gallery. It is not media by itself. For video, one frame from the start.
_Avoid_: preview, poster

**Name (名前)**:
The name of a media item's body that distinguishes it. Does not contain slashes.
_Avoid_: object key, title

**Upload (アップロード)**:
Copying images and videos from a folder on disk into gallery storage. Places thumbnail and body as a pair.
_Avoid_: import, sync, deploy

**Delivery (配信)**:
The path by which the browser receives the bytes of a stored body or thumbnail.
_Avoid_: download

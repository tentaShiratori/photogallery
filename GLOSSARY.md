# フォトギャラリー (Photo Gallery)

限られた人だけが見られる画像と動画の集まり。

## 画面

**ギャラリー (Gallery)**:
年の一覧と年の画面を合わせたもの。
_Avoid_: album, library, feed

**年の一覧 (Year list)**:
メディアがある年を並べ、年ごとに最大 4 枚のプレビューサムネイルを出すギャラリーの画面。
_Avoid_: year index, archive home

**年の画面 (Year screen)**:
選んだ 1 年のタイルだけを出すギャラリーの画面。
_Avoid_: year feed, year page

**タブの印 (Tab mark)**:
ギャラリーのタブに出す、文字のない色付きの輪の花。
_Avoid_: favicon, icon

**タイル (Tile)**:
年の画面で、メディア 1 件分の枠。
_Avoid_: card

**拡大表示 (Enlarged view)**:
選んだ 1 件の本体を大きく出す画面。
_Avoid_: viewer, lightbox, dialog, modal

**ログイン表示 (Login label)**:
ギャラリーの見出しの横に、見ている人を出すラベル。
_Avoid_: username, profile

**ローカルプレビュー (Local preview)**:
ログインメールがないとき、見出しの横に出す文言。ローカルのギャラリーだけで使う（`docs/spec-local`）。
_Avoid_: dev mode, logged out, guest

**年不明 (Unknown year)**:
撮影日時の年が決まらないメディアのラベル。あるときは年の一覧の最後。
_Avoid_: uncategorized, other

## 時刻

**撮影日時 (Capture date-time)**:
画像または動画を撮った暦の日付と時刻。秒まで含む。
_Avoid_: EXIF, timestamp, DateTimeOriginal, uploaded

**作成日時 (Creation date-time)**:
動画ファイルの中に、そのファイルを作った時刻として書いてある暦の日付と時刻。
_Avoid_: modification date-time

**Android の印 (Android mark)**:
Android の機器が動画の中に足した欄。
_Avoid_: com.android, manufacturer, model, capture.fps

**更新日時 (Modification date-time)**:
ディスク上のファイルを最後に更新した暦の日付と時刻。
_Avoid_: mtime

**アップロード時刻 (Upload time)**:
画像または動画をストレージに置いた時刻。

## 内容

**メディア (Media)**:
本体とサムネイルの両方があるとき、ギャラリーの 1 件として数える画像または動画。どちらか一方だけではメディアではない。
_Avoid_: file, object

**画像 (Image)**:
静止画のメディア。拡張子は jpg、jpeg、png、gif、webp、avif、heic、heif。
_Avoid_: photo

**動画 (Video)**:
動画のメディア。拡張子は mp4、mov、webm、m4v。
_Avoid_: clip, movie

**本体 (Body)**:
メディアの画像または動画の全体。拡大表示で使う。
_Avoid_: original, source

**サムネイル (Thumbnail)**:
ギャラリー向けにメディアから作った小さな静止画。それ自体はメディアではない。動画では先頭の 1 フレーム。
_Avoid_: preview, poster

**名前 (Name)**:
メディアを区別する本体の名前。スラッシュを含まない。
_Avoid_: object key, title

**アップロード (Upload)**:
ディスク上のフォルダから、画像と動画をギャラリーのストレージへコピーすること。サムネイルと本体を組にして置く。
_Avoid_: import, sync, deploy

**配信 (Delivery)**:
ストレージにある本体またはサムネイルのバイト列をブラウザが受け取る道。
_Avoid_: download

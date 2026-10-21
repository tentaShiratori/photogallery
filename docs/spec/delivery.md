# 配信

用語は [GLOSSARY.md](../../GLOSSARY.md)。

## UC-MEDIA-01

- ID: UC-MEDIA-01
- 前提: その名前の画像が置いてある。
- 操作: `/media/` に名前を続けて開く。フォルダで区切られた名前は、区切りを含んだまま続ける。
- 見えること:
  - 状態は 200。本文はその画像の中身。
  - `Content-Type` は、置いたときに付いていればそれ。無ければ拡張子で決まる。jpg と jpeg は `image/jpeg`、png は `image/png`、gif は `image/gif`、webp は `image/webp`、avif は `image/avif`、heic は `image/heic`、heif は `image/heif`。
  - `Accept-Ranges` は `bytes`。範囲を指定しないとき、`Content-Range` は無い。
  - `Cache-Control` は `private, max-age=3600`。共有キャッシュには乗せず、見ているブラウザに最大 1 時間残ることがある。
  - 空白や `#` を含む名前でも、URL ではその文字をエンコードして開き、同じ名前の中身が返る。
- 例外: 開けない形は UC-MEDIA-04。

## UC-MEDIA-02

- ID: UC-MEDIA-02
- 前提: その名前の動画が置いてある。
- 操作: `/media/` に名前を続けて開く。
- 見えること:
  - 状態は 200。本文はその動画の中身。
  - `Content-Type` は、置いたときに付いていればそれ。無ければ拡張子で決まる。mp4 は `video/mp4`、mov は `video/quicktime`、webm は `video/webm`、m4v は `video/x-m4v`。
  - `Accept-Ranges` は `bytes`。範囲を指定しないとき、`Content-Range` は無い。
  - `Cache-Control` は `private, max-age=3600`。
- 例外: 開けない形は UC-MEDIA-04。

## UC-MEDIA-03

- ID: UC-MEDIA-03
- 前提: その名前の画像または動画が置いてある。
- 操作: 同じ URL に範囲を付けて取る。範囲は `Range: bytes=開始-終了`、または末尾からの `Range: bytes=-長さ`。
- 見えること:
  - 状態は 206。本文はその範囲だけ。
  - `bytes=開始-終了` では、両端を含むバイトが返る。`Content-Range` は `bytes 開始-終了/全体の長さ`。例は、長さ 1024 の `bytes=0-99` に対し `bytes 0-99/1024`、本文 100 バイト。
  - `bytes=-長さ` では、末尾からその長さが返る。例は、長さ 1024 の `bytes=-50` に対し `bytes 974-1023/1024`、本文 50 バイト。
  - `Accept-Ranges` は `bytes`。`Cache-Control` は `private, max-age=3600`。
  - 拡大表示で動画のシークをすると、この取り方になる。
- 例外: なし

## UC-MEDIA-04

- ID: UC-MEDIA-04
- 前提: なし。
- 操作: `/media/` の下が空の URL、`..` を含む名前、`\` を含む名前、先頭が `/` になる名前、空の区切りを含む名前、壊れた `%`、画像でも動画でもない拡張子、または置いていない名前を開く。
- 見えること: 状態は 404。本文は「見つかりません。」画像でも動画でもない名前は、中身が置いてあっても同じ。
- 例外: なし

## UC-MEDIA-05

- ID: UC-MEDIA-05
- 前提: なし。
- 操作: `/`、`/api/media`、`/media/` 以外の場所を開く。
- 見えること: 状態は 404。本文は「見つかりません。」
- 例外: なし

## UC-MEDIA-06

- ID: UC-MEDIA-06
- 前提: HEIC または HEIF の画像が置いてある。
- 操作: ギャラリーのタイルで見る。または UC-MEDIA-01 で中身を取る。
- 見えること: 中身は渡る。`Content-Type` は UC-MEDIA-01。Windows のブラウザでは、絵として出ないことが多い。
- 例外: なし

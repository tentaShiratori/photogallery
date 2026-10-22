# UC-04 Upload a folder

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-04
- Name: Upload a folder
- Primary actor: Script
- Preconditions: None
- Related: R-MEDIA-04 is target extensions. R-MEDIA-01 is name shape. R-MEDIA-03 is how capture date-time is decided.
- Postconditions (success):
  - When there is at least one target, the console shows 「本番の photogallery-media へ N 件」. For each uploaded item, 「`uploaded 手元の名前 -> 付けた名前 (バイト数 bytes)`」 is shown. The assigned name is the body. The thumbnail is written before the body is placed. The order of these lines is not necessarily the folder order. Images and videos on disk remain.
  - When there are zero targets, 「アップロード対象の画像・動画はフォルダ直下にありませんでした。」 is shown.
  - When the count is at least one, entering anything other than `yes` after the destination line shows 「キャンセルしました。何も上げませんでした。」 and nothing is placed in storage.
  - For local, the destination line is 「ローカルの photogallery-media へ N 件」. There is no confirmation wait. Uploaded lines and placement match production.
- Postconditions (failure):
  - When no folder is passed, 「使い方: pnpm upload:prd <フォルダ>」 is shown and it fails. For local, 「使い方: pnpm upload:local <フォルダ>」.
  - When the given path is not a folder, 「フォルダではありません: 」 followed by that path is shown and it fails.
  - After `yes`, when required configuration is missing, the missing item name followed by 「が未設定です。.env.example を見て .env を作ってください。」 is shown and it fails. Nothing is placed in storage.
  - For local, when the usual dev server is running and storage cannot be written, 「`pnpm dev` を止めてから実行して」 is shown and it fails. Nothing is placed in storage.
  - After the count is shown, failure while deciding names means no image or video is uploaded.
  - When some uploads fail mid-run, 「`failed 手元の名前: 理由`」 is shown and after completion 「N 件失敗しました。」 indicates failure. Items that did not fail are placed.

### Flow

1. The script starts with 「`pnpm upload:prd <フォルダ>`」. A leading `--` is skipped.
   - 1a. Local.
     1. The script starts with 「`pnpm upload:local <フォルダ>`」. A leading `--` is skipped.
     - 1a-e. No folder is passed.
       1. The script shows 「使い方: pnpm upload:local <フォルダ>」 and fails.
     - 1a-f. The given path is not a folder.
       1. The script shows 「フォルダではありません: 」 followed by that path and fails.
     2. The script counts targets with R-MEDIA-04.
     - 1a-a. Zero targets.
       1. The script shows 「アップロード対象の画像・動画はフォルダ直下にありませんでした。」.
     3. The script shows 「ローカルの photogallery-media へ N 件」.
     4. The script decides each target's name with R-MEDIA-03 and R-MEDIA-01.
     - 1a-g. Failure while deciding names.
       1. The script fails without uploading any.
     5. The script writes the thumbnail then the body. For each item it shows 「`uploaded 手元の名前 -> 付けた名前 (バイト数 bytes)`」. The assigned name is the body.
     - 1a-h. The usual dev server is running and storage cannot be written.
       1. The script shows 「`pnpm dev` を止めてから実行して」 and fails. It uploads none.
     - 1a-i. Some uploads fail mid-run.
       1. The script shows 「`failed 手元の名前: 理由`」 and continues with remaining targets.
       2. After completion the script shows 「N 件失敗しました。」 and fails.
   - 1e. No folder is passed.
     1. The script shows 「使い方: pnpm upload:prd <フォルダ>」 and fails.
   - 1f. The given path is not a folder.
     1. The script shows 「フォルダではありません: 」 followed by that path and fails.
2. The script counts targets with R-MEDIA-04.
   - 2a. Zero targets.
     1. The script shows 「アップロード対象の画像・動画はフォルダ直下にありませんでした。」.
3. The script shows 「本番の photogallery-media へ N 件」.
4. The script decides each target's name with R-MEDIA-03 and R-MEDIA-01.
   - 4e. Failure while deciding names.
     1. The script fails without uploading any.
5. The script shows 「本番へ上げます。yes と入力してください: 」 and waits for confirmation.
   - 5a. Input is not `yes`.
     1. The script shows 「キャンセルしました。何も上げませんでした。」 and uploads none.
   - 5e. After `yes`, required configuration is missing.
     1. The script shows the missing item name followed by 「が未設定です。.env.example を見て .env を作ってください。」 and fails.
6. The script writes the thumbnail then the body. For each item it shows 「`uploaded 手元の名前 -> 付けた名前 (バイト数 bytes)`」. The assigned name is the body.
   - 6e. Some uploads fail mid-run.
     1. The script shows 「`failed 手元の名前: 理由`」 and continues with remaining targets.
     2. After completion the script shows 「N 件失敗しました。」 and fails.

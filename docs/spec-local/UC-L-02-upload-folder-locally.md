# UC-L-02 Upload a folder locally

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-L-02
- Name: Upload a folder locally
- Primary actor: Script
- Preconditions: None
- Related: R-MEDIA-04 is image and video extensions. R-MEDIA-01 is name shape. R-MEDIA-03 is how capture date-time is decided. R-LOCAL-01 is local upload storage lock. Production upload is [UC-04](../spec/UC-04-upload-folder.md).
- Postconditions (success):
  - When there is at least one target, the console shows 「ローカルの photogallery-media へ N 件」. For each uploaded item it shows 「`uploaded 手元の名前 -> 付けた名前 (バイト数 bytes)`」. The assigned name is the body name. The thumbnail is written before the body is stored. These lines are not necessarily in folder order. The images and videos on disk remain.
  - When there are zero targets, 「アップロード対象の画像・動画はフォルダ直下にありませんでした。」 is shown.
  - The script does not wait for confirmation.
- Postconditions (failure):
  - When no folder is passed, 「使い方: pnpm upload:local <フォルダ>」 is shown and the script fails.
  - When the given path is not a folder, 「フォルダではありません: 」 followed by that path is shown and the script fails.
  - When the usual development server is running and storage cannot be written, 「`pnpm dev` を止めてから実行して」 is shown and the script fails. Nothing is stored.
  - After the count is shown, if naming fails mid-run, no image or video is uploaded.
  - When some uploads fail mid-run, 「`failed 手元の名前: 理由`」 is shown, and after the run finishes 「N 件失敗しました。」 is shown and the script fails. Items that did not fail are stored.

### Flow

1. The script starts with 「`pnpm upload:local <フォルダ>`」. A leading `--` is skipped.
   - 1e. No folder is passed.
     1. The script shows 「使い方: pnpm upload:local <フォルダ>」 and fails.
   - 1f. The given path is not a folder.
     1. The script shows 「フォルダではありません: 」 followed by that path and fails.
2. The script counts targets with R-MEDIA-04.
   - 2a. There are zero targets.
     1. The script shows 「アップロード対象の画像・動画はフォルダ直下にありませんでした。」.
3. The script shows 「ローカルの photogallery-media へ N 件」.
4. The script decides each target's name with R-MEDIA-03 and R-MEDIA-01.
   - 4e. Naming fails.
     1. The script fails without uploading anything.
5. The script writes the thumbnail, then the body. For each item it shows 「`uploaded 手元の名前 -> 付けた名前 (バイト数 bytes)`」. The assigned name is the body name.
   - 5e. The usual development server is running and storage cannot be written.
     1. The script shows 「`pnpm dev` を止めてから実行して」 and fails. It uploads nothing.
   - 5f. Some uploads fail mid-run.
     1. The script shows 「`failed 手元の名前: 理由`」 and continues with the remaining targets.
     2. After the run finishes, the script shows 「N 件失敗しました。」 and fails.

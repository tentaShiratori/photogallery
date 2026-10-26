# エージェント向け

コードを変える前に、下の 5 つを守る。ユーザー向けの手順は README。

1. Worker とアップロードスクリプト（`scripts/upload-local.ts` / `scripts/upload-prd.ts`）は TypeScript。Workers は JavaScript が第一級。Python は範囲が狭く、Go は非対応。
2. インフラは `infra/prd`。状態は S3 バケット `photogallery-tfstate`（`ap-northeast-1`）。Cloudflare に CloudFormation 相当はない。Terraform が持つのは R2、Worker の器、Access（Google IdP と許可メール）。スクリプト本文と R2 バインディングは Wrangler（`wrangler.jsonc`）。両方でバージョンを管理しない。
3. `wrangler.jsonc` の `name` / `bucket_name` は Terraform の `local.worker_name` / `local.bucket_name` と揃える。
4. `.env`、`terraform.tfvars`、API トークン、R2 シークレットをコミットしない。`mise.toml` の `_.file` が `.env` を環境変数として読む。Google のクライアント ID とシークレットは `terraform.tfvars`。R2 バケットは公開しない。
5. 撮影日時はアップロード時に `src/lib/gallery.ts` がバイト列から決める。

挙動を変える PR は同じ PR で仕様を直し、触った UC ID を本文に書く。本番の挙動は [docs/spec](docs/spec/README.md)。ローカルだけの挙動は [docs/spec-local](docs/spec-local/README.md)。ユースケースの形は `.agents/skills/write-spec`（正本は [references/writing.md](.agents/skills/write-spec/references/writing.md)）に合わせる。文書を書くときは、まず `/technical-writing` を使って英語で書く。次に日本語に訳し、`/yomiyasu` で推敲して仕上げる。リポジトリに残すのは日本語の文書だけである。PR の説明にもこの流れを使う。画面とコンソールの文言は、製品どおりの文字列を「」の中に残す。UC のファイル名は日本語の名前に合わせる。例は `docs/spec/UC-01-ギャラリーを見る.md` である。ID は変えない。

## 実行するコマンド

ツールは mise（`mise.toml`）。依存関係は pnpm。fmt と lint は Vite+（`vp fmt` / `vp lint`）。コミット時は lefthook がステージしたファイルに対して実行する。エージェントがファイルを編集したあとは `.cursor/hooks.json` が同じコマンドをそのファイルに実行する。Vite+ の Git hook（`.vite-hooks`）は使わない。

```powershell
pnpm dev
pnpm deploy
pnpm upload:local <フォルダ>
pnpm upload:prd <フォルダ>
pnpm typecheck
pnpm exec vp fmt
pnpm exec vp lint
pnpm test run src/lib/pair.test.ts
pnpm test run src/lib/gallery.test.ts
pnpm test run src/lib/media.test.ts
pnpm test run src/routes/index.test.tsx
pnpm test run src/routes/lib/feed.test.ts
pnpm test run test/worker.test.ts
pnpm e2e
pnpm e2e:update-screenshots
```

テストはファイルを指定して実行する。全テストファイルをまとめて実行しない。

`pnpm e2e` は UC-01 / UC-02 のブラウザ E2E（Chromium、PC と mobile の 2 ビューポート）。ギャラリーの UC 挙動を変えた PR では、対応する `tests/uc-*.e2e.ts` を直す。

`pnpm e2e:update-screenshots` で UC のスクショを全部撮り直す。比較用の `tests/*-screenshots.e2e.ts-snapshots/` と、仕様書の `docs/spec/screenshots/UC-NN/` の両方を書く。`pnpm e2e --update-snapshots` は e2e の baseline だけを直す。画面を変えたら撮り直し、差分が出るかを CI の e2e が見る。

## 実行するコマンド

- `pnpm deadcode` — 使っていないコードと依存を検出。0 件で終了し、終了コード 0 が返ること。
  - 指摘は消すか、`.fallowrc.jsonc` に理由つきで足すかのどちらかで直す。
  - baseline ファイルは作らない。
  - `pnpm install` のあと `pnpm deadcode` で確認。

- `pnpm e2e --update-snapshots` は e2e の baseline だけを直す。画面を変えたら撮り直し、差分が出るかを CI の e2e が見る。

- `src/lib/pair.test.ts` — Node 環境。`src/lib/pair.ts` のステムと、1 年ずつ読む揃った組の一覧を検証する
- `src/lib/gallery.test.ts` — Node 環境。`src/lib/gallery.ts` の EXIF と更新日時を検証する
- `src/lib/media.test.ts` — Node 環境。`src/lib/media.ts` の純粋関数を検証する
- `src/routes/index.test.tsx` — Node 環境。`src/routes/index.tsx` の JSX を検証する
- `src/routes/lib/feed.test.ts` — Node 環境。`src/routes/lib/feed.ts` の 60 件ずつの表示、続きの取得、失敗と文言を検証する
- `test/worker.test.ts` — Worker 環境（Miniflare）。`GET /`、`GET /api/media`、`GET /media/*`（Range 206 を含む）を Worker ランタイムで検証する

アップロード対象の判定は `src/lib/media.ts` の `selectUploadNames` に寄せる。

## 触るファイル

1. `src/index.tsx` — Hono の入口。`src/routes` のハンドラを繋ぐ
2. `src/renderer.tsx` — 共通レイアウト（html / head）。全体の見た目はここにある `hono/css`
3. `src/routes/index.tsx` — `GET /`。ギャラリーのサーバー JSX
4. `src/routes/api/media.ts` — `GET /api/media`。R2 の一覧
5. `src/routes/media.ts` — `GET /media/*`。R2 の配信と Range
6. `src/routes/lib/client.tsx` — ブラウザ側のギャラリー（`hono/jsx/dom`）。`src/renderer.tsx` の `Script` がエントリ。表示と続きの規則は同じディレクトリの `feed.ts`。タイルと拡大表示は `MediaTile.tsx` / `MediaViewer.tsx`。`hono/css` はそのファイルで定義する
7. `src/lib/media.ts` — 拡張子、キー、Range。Worker とアップロードスクリプトの共通部分
8. `src/lib/pair.ts` — ステム、サムネイルキー、年を探して 1 年ずつ読む揃ったメディアの一覧
9. `src/lib/gallery.ts` — バイト列からの撮影日時
10. `src/lib/types.ts` — `Env` とハンドラ型
11. `scripts/upload-local.ts` — ローカルの模擬バケット（`pnpm dev` の `.wrangler/state`）へ上げる。`.env` 不要
12. `scripts/upload-prd.ts` — 本番 R2（S3 互換 API）へ上げる。件数表示のあと `yes` で確定
13. `scripts/lib/` — サムネイル、対象の選定と名前付け、ObjectSink への put。入口は上の 2 つ
14. `infra/prd` — Cloudflare リソース

次: 変更がテスト対象なら対応するテストを実行する。

- `src/lib/pair.ts` を変えたら `pnpm test run src/lib/pair.test.ts`
- `src/lib/gallery.ts` を変えたら `pnpm test run src/lib/gallery.test.ts`
- `src/lib/media.ts` を変えたら `pnpm test run src/lib/media.test.ts`
- `src/routes/index.tsx` を変えたら `pnpm test run src/routes/index.test.tsx`
- `src/routes/lib/feed.ts` を変えたら `pnpm test run src/routes/lib/feed.test.ts`
- ルーティングや R2 配信を変えたら `pnpm test run test/worker.test.ts`

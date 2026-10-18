# エージェント向け

コードを変える前に、下の 5 つを守る。ユーザー向けの手順は README。

1. Worker と `scripts/upload.ts` は TypeScript。Workers は JavaScript が第一級。Python は範囲が狭く、Go は非対応。
2. インフラは `infra/prd`。状態は S3 バケット `photogallery-tfstate`（`ap-northeast-1`）。Cloudflare に CloudFormation 相当はない。Terraform が持つのは R2、Worker の器、Access（Google IdP と許可メール）。スクリプト本文と R2 バインディングは Wrangler（`wrangler.jsonc`）。両方でバージョンを管理しない。
3. `wrangler.jsonc` の `name` / `bucket_name` は Terraform の `local.worker_name` / `local.bucket_name` と揃える。
4. `.env`、`terraform.tfvars`、API トークン、R2 シークレットをコミットしない。`mise.toml` の `_.file` が `.env` を環境変数として読む。Google のクライアント ID とシークレットは `terraform.tfvars`。R2 バケットは公開しない。配信は Worker の `/media/` だけ。
5. 撮影日時はアップロード時に `src/lib/gallery.ts` がバイト列から決める。日付タグが無いときだけ、アップロード時刻より 7 日より古いファイルの更新日時を使う。オブジェクトキーは `YYYY-MM-DDTHH-mm-ss.拡張子`。日付が決まらないキーは年不明。月、アルバム、地図には広げない。R2 の `uploaded` は撮影時刻に使わない。

## 実行するコマンド

ツールは mise（`mise.toml`）。依存関係は pnpm。fmt と lint は Vite+（`vp fmt` / `vp lint`）。コミット時は lefthook がステージしたファイルに対して実行する。エージェントがファイルを編集したあとは `.cursor/hooks.json` が同じコマンドをそのファイルに実行する。Vite+ の Git hook（`.vite-hooks`）は使わない。

```powershell
pnpm dev
pnpm deploy
pnpm upload -- <フォルダ>
pnpm typecheck
pnpm exec vp fmt
pnpm exec vp lint
pnpm test run src/lib/media.test.ts
pnpm test run src/routes/index.test.tsx
pnpm test run test/worker.test.ts
```

テストはファイルを指定して実行する。全テストファイルをまとめて実行しない。

- `src/lib/media.test.ts` — Node 環境。`src/lib/media.ts` の純粋関数を検証する
- `src/routes/index.test.tsx` — Node 環境。`src/routes/index.tsx` の JSX を検証する
- `test/worker.test.ts` — Worker 環境（Miniflare）。`GET /`、`GET /api/media`、`GET /media/*`（Range 206 を含む）を Worker ランタイムで検証する

アップロードは引数フォルダの直下だけ。サブフォルダは対象外。対象拡張子の判定は `src/lib/media.ts` の `selectUploadNames` に寄せる。

## 触るファイル

1. `src/index.tsx` — Hono の入口。`src/routes` のハンドラを繋ぐ
2. `src/renderer.tsx` — 共通レイアウト（html / head）。全体の見た目はここにある `hono/css`
3. `src/routes/index.tsx` — `GET /`。ギャラリーのサーバー JSX
4. `src/routes/api/media.ts` — `GET /api/media`。R2 の一覧
5. `src/routes/media.ts` — `GET /media/*`。R2 の配信と Range
6. `src/routes/lib/client.tsx` — ブラウザ側のギャラリー（`hono/jsx/dom`）。`src/renderer.tsx` の `Script` がエントリ。タイルとダイアログは同じディレクトリの `MediaTile.tsx` / `MediaViewer.tsx`。`hono/css` はそのファイルで定義する
7. `src/lib/media.ts` — 拡張子、キー、Range。Worker とアップロードスクリプトの共通部分
8. `src/lib/types.ts` — `Env` とハンドラ型
9. `scripts/upload.ts` — ローカルから R2（S3 互換 API）へのアップロード
10. `infra/prd` — Cloudflare リソース

次: 変更がテスト対象なら対応するテストを実行する。

- `src/lib/media.ts` を変えたら `pnpm test run src/lib/media.test.ts`
- `src/routes/index.tsx` を変えたら `pnpm test run src/routes/index.test.tsx`
- ルーティングや R2 配信を変えたら `pnpm test run test/worker.test.ts`

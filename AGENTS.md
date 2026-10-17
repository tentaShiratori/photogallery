# エージェント向け

コードを変える前に、下の 5 つを守る。ユーザー向けの手順は README。

1. Worker と `scripts/upload.ts` は TypeScript。Workers は JavaScript が第一級。Python は範囲が狭く、Go は非対応。
2. インフラは `infra/terraform`。状態は S3 バケット `photogallery-tfstate`（`ap-northeast-1`）。Cloudflare に CloudFormation 相当はない。Terraform が持つのは R2、Worker の器、Access（Google IdP と許可メール）。スクリプト本文と R2 バインディングは Wrangler（`wrangler.jsonc`）。両方でバージョンを管理しない。
3. `wrangler.jsonc` の `name` / `bucket_name` は Terraform の `local.worker_name` / `local.bucket_name` と揃える。
4. `.env`、`terraform.tfvars`、API トークン、R2 シークレットをコミットしない。`mise.toml` の `_.file` が `.env` を環境変数として読む。Google のクライアント ID とシークレットは `terraform.tfvars`。R2 バケットは公開しない。配信は Worker の `/media/` だけ。
5. 撮影年での分類は未実装。README の「追加機能メモ」以上に広げない。ファイルの更新日時を撮影年の代わりに使わない。

## 実行するコマンド

ツールは mise（`mise.toml`）。依存関係は pnpm。

```powershell
pnpm dev
pnpm deploy
pnpm upload -- <フォルダ>
pnpm typecheck
pnpm test run test/media.test.ts
pnpm test run test/page.test.ts
pnpm test run test/worker.test.ts
```

テストはファイルを指定して実行する。全テストファイルをまとめて実行しない。

- `test/media.test.ts` — Node 環境。`src/media.ts` の純粋関数を検証する
- `test/page.test.ts` — Node 環境。`src/page.ts` の HTML 生成を検証する
- `test/worker.test.ts` — Worker 環境（Miniflare）。`GET /`、`GET /api/media`、`GET /media/*`（Range 206 を含む）を Worker ランタイムで検証する

アップロードは引数フォルダの直下だけ。サブフォルダは対象外。対象拡張子の判定は `src/media.ts` の `selectUploadNames` に寄せる。

## 触るファイル

1. `src/index.ts` — リクエストの振り分け、R2 の一覧と配信
2. `src/page.ts` — ギャラリー HTML
3. `src/media.ts` — 拡張子、キー、Range。Worker とアップロードスクリプトの共通部分
4. `scripts/upload.ts` — ローカルから R2（S3 互換 API）へのアップロード
5. `infra/terraform` — Cloudflare リソース

次: 変更がテスト対象なら対応するテストを実行する。

- `src/media.ts` を変えたら `pnpm test run test/media.test.ts`
- `src/page.ts` を変えたら `pnpm test run test/page.test.ts`
- `src/index.ts` やルーティング、R2 配信を変えたら `pnpm test run test/worker.test.ts`
- Hono 化、JSX / React 化、撮影年での分類を追加するときも Worker 統合テストで確認する

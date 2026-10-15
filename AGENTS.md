# エージェント向け

このリポジトリは Cloudflare 上の非公開フォトギャラリー。ユーザー向けの手順は README にある。

## 守る範囲

- Worker と `scripts/upload.ts` は TypeScript。Workers は JavaScript が第一級で、Python は範囲が狭く、Go は非対応。
- インフラは `infra/terraform`。Cloudflare に CloudFormation 相当はない。
- Terraform が持つのは R2、Worker の器、Access（Google IdP と許可メール）、任意のカスタムホスト名。スクリプト本文と R2 バインディングは Wrangler（`wrangler.jsonc`）が持つ。両方でバージョンを管理しない。
- `wrangler.jsonc` の `name` / `bucket_name` は Terraform の `worker_name` / `bucket_name` と揃える。
- `.env`、`terraform.tfvars`、API トークン、R2 シークレットをコミットしない。
- R2 バケットは公開しない。配信は Worker の `/media/` だけ。
- 撮影年での分類は未実装。README の「追加機能メモ」以上に広げない。ファイルの更新日時を撮影年の代わりに使わない。

## コマンド

ツールは mise（`mise.toml`）。依存関係は pnpm。

```powershell
pnpm dev
pnpm deploy
pnpm upload -- <フォルダ>
pnpm typecheck
pnpm test run test/media.test.ts
pnpm test run test/page.test.ts
```

テストはファイルを指定して実行する。全テストファイルをまとめて実行しない。

アップロードは引数フォルダの直下だけ。サブフォルダは対象外。対象拡張子の判定は `src/media.ts` の `selectUploadNames` に寄せる。

## 配置

- `src/index.ts` リクエストの振り分け、R2 の一覧と配信
- `src/page.ts` ギャラリー HTML
- `src/media.ts` 拡張子、キー、Range。Worker とアップロードスクリプトの共通部分
- `scripts/upload.ts` ローカルから R2（S3 互換 API）へのアップロード
- `infra/terraform` Cloudflare リソース

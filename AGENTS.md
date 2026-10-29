# エージェント向け

コードを変える前に、下の 6 つを守る。ユーザー向けの手順は README。

1. Worker とアップロードスクリプト（`scripts/upload-local.ts` / `scripts/upload-prd.ts`）は TypeScript。Workers は JavaScript が第一級。Python は範囲が狭く、Go は非対応。
2. インフラは `infra/prd`。状態は S3 バケット `photogallery-tfstate`（`ap-northeast-1`）。Cloudflare に CloudFormation 相当はない。Terraform が持つのは R2、Worker の器、Access（Google IdP と許可メール）。スクリプト本文と R2 バインディングは Wrangler（`wrangler.jsonc`）。両方でバージョンを管理しない。
3. `wrangler.jsonc` の `name` / `bucket_name` は Terraform の `local.worker_name` / `local.bucket_name` と揃える。
4. `.env`、`terraform.tfvars`、API トークン、R2 シークレットをコミットしない。`mise.toml` の `_.file` が `.env` を環境変数として読む。Google のクライアント ID とシークレットは `terraform.tfvars`。R2 バケットは公開しない。
5. 撮影日時はアップロード時に `src/lib/gallery/index.ts` がバイト列から決める。実装は `src/lib/gallery/` にあり、公開入口は `index.ts` にする。揃ったメディア一覧の実装は `src/lib/pair/` にあり、公開入口は `index.ts` にする。
6. 1 ファイル 300 行まで（空行とコメントも数える）。超えたら役割ごとに分ける。`vite.config.ts` の oxlint `max-lines` が lint・lefthook・Cursor hook・CI で止める。`oxlint-disable` で外さない。`.agents/` は lint 対象外のまま。

挙動を変える PR は同じ PR で仕様を直し、触った UC ID を本文に書く。本番の挙動は [docs/spec](docs/spec/README.md)。ローカルだけの挙動は [docs/spec-local](docs/spec-local/README.md)。ユースケースの形は `.agents/skills/write-spec`（正本は [references/writing.md](.agents/skills/write-spec/references/writing.md)）に合わせる。文書を書くときは、まず `/technical-writing` を使って英語で書く。次に日本語に訳し、`/yomiyasu` で推敲して仕上げる。リポジトリに残すのは日本語の文書だけである。PR の説明にもこの流れを使う。画面とコンソールの文言は、製品どおりの文字列を「」の中に残す。UC のファイル名は日本語の名前に合わせる。例は `docs/spec/UC-01-ギャラリーを見る.md` である。ID は変えない。

e2e 以外のチェックは `pnpm check` に足す。CI に直接書かない。足せば lefthook と Cursor の hook にも効く。

## 実行するコマンド

ツールは mise（`mise.toml`）。依存関係は pnpm。fmt と lint は Vite+（`vp fmt` / `vp lint`）。コミット時は lefthook がステージしたファイルに対して fmt と lint を実行する。push 前は lefthook が `pnpm check` を実行する。エージェントがファイルを編集したあとは `.cursor/hooks.json` の `afterFileEdit` が同じ fmt と lint をそのファイルに実行する。エージェントが作業を終えるときは `stop` hook が `pnpm check` を実行し、失敗したらエラーを返して直しに戻す。Vite+ の Git hook（`.vite-hooks`）は使わない。

```powershell
pnpm dev
pnpm deploy
pnpm upload:local <フォルダ>
pnpm upload:prd <フォルダ>
pnpm check
pnpm typecheck
pnpm exec vp fmt
pnpm exec vp lint
pnpm test run <テストファイル>
pnpm e2e
pnpm e2e:update-screenshots
```

手で回すときはファイルを指定する。まとめて流すのは hook と CI（`pnpm check`）。

`pnpm check` は e2e 以外のチェックをまとめたもの（`vp fmt --check`、`vp lint`、`pnpm deadcode`、`pnpm typecheck`、`pnpm test run`）。fmt は書き換えずにチェックだけする。

`pnpm e2e` は UC-01 / UC-02 のブラウザ E2E（Chromium、PC と mobile の 2 ビューポート）。ギャラリーの UC 挙動を変えた PR では、対応する `tests/uc-*.e2e.ts` を直す。

`pnpm e2e:update-screenshots` で UC のスクショを全部撮り直す。比較用の `tests/*-screenshots.e2e.ts-snapshots/` と、仕様書の `docs/spec/screenshots/UC-NN/` の両方を書く。`pnpm e2e --update-snapshots` は e2e の baseline だけを直す。画面を変えたら撮り直し、差分が出るかを CI の e2e が見る。

## 実行するコマンド

- `pnpm check` — e2e 以外のチェックをまとめて実行する。新しいチェックはここに足す。
- `pnpm deadcode` — 使っていないコードと依存を検出。0 件で終了し、終了コード 0 が返ること。
  - 指摘は消すか、`.fallowrc.jsonc` に理由つきで足すかのどちらかで直す。
  - baseline ファイルは作らない。
  - `pnpm install` のあと `pnpm deadcode` で確認。

- `pnpm e2e --update-snapshots` は e2e の baseline だけを直す。画面を変えたら撮り直し、差分が出るかを CI の e2e が見る。

アップロード対象の判定は `src/lib/media.ts` の `selectUploadNames` に寄せる。

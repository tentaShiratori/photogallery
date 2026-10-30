# フォトギャラリー

挙動の正は [本番の仕様](docs/spec/README.md)。ローカルだけの挙動は [ローカルの仕様](docs/spec-local/README.md)。

今すぐ見る。所要は約 5 分。

1. このリポジトリのルートで `mise install` を実行する
2. `pnpm install` を実行する
3. `pnpm dev` を実行する
4. ブラウザで `http://localhost:8787` を開く
5. 別の PowerShell で、画像や動画の入ったフォルダを指定して実行する

```powershell
pnpm upload:local D:\photos\sample
```

ここまでで画面に「ローカルプレビュー」と、撮影年ごとのサムネイルが出る。このとき R2 はローカルの模擬バケットで、Google のログインは通らない。`.env` は不要。画面は [UC-L-01 ローカルでギャラリーを見る](docs/spec-local/UC-L-01-ローカルでギャラリーを見る.md)。上げ方の詳細は [UC-L-02 ローカルでフォルダをアップロードする](docs/spec-local/UC-L-02-ローカルでフォルダをアップロードする.md)。

## テスト

1 ファイルだけ指定する。所要は約 1 分。

```powershell
pnpm test run <テストファイル>
```

## 計測

どこに時間がかかっているかを見るだけ。速くする修正は別。年の一覧、年の画面、拡大表示を、Playwright と web-vitals と Lighthouse で測る。

```powershell
pnpm seed:perf
pnpm perf
pnpm perf -- --local
pnpm perf -- --scenario year-list
pnpm perf:year-list
```

本番が既定。URL は `PHOTOGALLERY_URL` で上書きする。ローカルは `pnpm seed:perf` のあと `pnpm dev` を `http://localhost:8787` で動かしてから `--local` を付ける。ブラウザは `~/.photogallery-perf`（リポジトリの外）。本番の初回だけ画面ありで Access にログインし、2 回目から画面なし。結果はターミナルだけ。速さの改善を見るとき以外は回さない。進め方の観点は `.cursor/skills/verify-photogallery`。

## Cloudflare へ出す

初回は約 45 分。トークンと Google の OAuth クライアントが既にあるなら約 10 分。

### 1. `.env` を作る

リポジトリのルートで `.env.example` を `.env` にコピーして埋める。mise がこのファイルを環境変数として読む。ファイルはコミットしない。`.env` がまだ無くても、ローカルプレビューは動く。

`CLOUDFLARE_API_TOKEN` には、次の 4 つを付けた Cloudflare の API トークンを書く。

1. Workers Scripts の Read と Write
2. Workers R2 Storage の Write
3. Access の Apps and Policies の Write
4. Access の Organizations, Identity Providers, and Groups の Write

画像と動画を上げるときの R2 キーも、同じファイルの `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` に書く。Google のクライアント ID とシークレットはここには書かず、`terraform.tfvars` に置く。

### 2. Google ログインを作る

1. Google Cloud で OAuth クライアント（ウェブアプリケーション）を作る。any-project で作成済みである。
2. 承認済みリダイレクト URI を次の形にする。`<team-name>` は Zero Trust のチーム名

`https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`

3. `infra\prd` で `copy terraform.tfvars.example terraform.tfvars` を実行する
4. クライアント ID、シークレット、見られてよい Google アカウント（`allowed_emails`）を `terraform.tfvars` に書く

### 3. Terraform を適用する

状態は Amazon S3。バケットは先に作り、バージョニングを付ける。ロックは同じバケットのロックファイル。DynamoDB は使わない。認証は aws cli の認証情報。このキーはリポジトリに置かない。

```powershell
cd infra\prd
terraform init
terraform apply
```

作るものは R2 バケット、空の Worker、Google の Identity Provider、その Worker を守る Access アプリケーション。公開先は `workers.dev` だけ。誰がギャラリーに届くかは [UC-03 ギャラリーに入る](docs/spec/UC-03-ギャラリーに入る.md)。

### 4. Worker のコードを出す

リポジトリのルートに戻って実行する。

```powershell
pnpm deploy
```

### 5. 画像と動画を上げる

1. ダッシュボードの R2 > Manage R2 API Tokens で、対象バケットへの Object Read & Write を持つ S3 互換キーを作る。このキーは Terraform の API トークンとは別
2. `.env` の `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` を埋める
3. フォルダを指定して上げる。最初の行のあと、`yes` と入力する

```powershell
pnpm upload:prd D:\photos\2024-trip
```

何が上がり、どんな名前になるかは [UC-04 フォルダをアップロードする](docs/spec/UC-04-フォルダをアップロードする.md) と [メディアのルール](docs/spec/domain/media.md)。画面での見え方は [UC-01 ギャラリーを見る](docs/spec/UC-01-ギャラリーを見る.md) と [ギャラリーのルール](docs/spec/app/gallery.md)。

## 名前と役割

バケット名と Worker 名は `infra/prd/main.tf` の `locals` に固定してある。`wrangler.jsonc` の `name` と `bucket_name` も同じ値にする。`.env` の `R2_BUCKET_NAME` も同じバケット名にする。

| もの                      | 役割                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| R2 `photogallery-media`   | 非公開の画像・動画。場所の希望は `apac`                                                                                         |
| Worker `photogallery`     | 一覧と配信。R2 はバインディング経由で読む                                                                                       |
| Access                    | Worker 全体（`workers.dev` とプレビューを含む）を Google ログインの奥に置く                                                     |
| `scripts/upload-prd.ts`   | 指定フォルダを本番 R2 の S3 API へ上げる。対象は [UC-04](docs/spec/UC-04-フォルダをアップロードする.md)                         |
| `scripts/upload-local.ts` | 指定フォルダをローカルの模擬バケットへ上げる。対象は [UC-L-02](docs/spec-local/UC-L-02-ローカルでフォルダをアップロードする.md) |

バケットは公開しない。ブラウザから中身を見るときの挙動は [ギャラリーのルール](docs/spec/app/gallery.md)。

Workers の実行言語は JavaScript と TypeScript が第一級である。Python は対応範囲が狭く、Go はそのままでは動かない。Worker もアップロードスクリプトも TypeScript である。

Cloudflare には AWS CloudFormation に当たるスタックサービスはない。インフラは Terraform の公式プロバイダ（v5）。Worker のソース配置だけは Wrangler。Terraform がバージョンまで持つと、デプロイのたびに両方が同じ Worker を取り合う。

ツールは [mise](https://mise.jdx.dev/) が Node.js 26、pnpm 12、Terraform 1.16、lefthook 2.2 を入れる。`mise install` のあと `lefthook install` を一度実行すると、コミット前に `vp fmt --check` と `vp lint` が走る。

## 画面

- [UC-01 ギャラリーを見る](docs/spec/UC-01-ギャラリーを見る.md)
- [UC-02 拡大して見る](docs/spec/UC-02-拡大して見る.md)
- [UC-03 ギャラリーに入る](docs/spec/UC-03-ギャラリーに入る.md)
- [UC-04 フォルダをアップロードする](docs/spec/UC-04-フォルダをアップロードする.md)
- [UC-L-01 ローカルでギャラリーを見る](docs/spec-local/UC-L-01-ローカルでギャラリーを見る.md)
- [UC-L-02 ローカルでフォルダをアップロードする](docs/spec-local/UC-L-02-ローカルでフォルダをアップロードする.md)
- [メディアのルール](docs/spec/domain/media.md)
- [ギャラリーのルール](docs/spec/app/gallery.md)

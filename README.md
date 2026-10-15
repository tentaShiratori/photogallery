# フォトギャラリー

今すぐ見る。所要は約 5 分。

1. このリポジトリのルートで `mise install` を実行する
2. `pnpm install` を実行する
3. `pnpm dev` を実行する
4. ブラウザで `http://localhost:8787` を開く
5. 別の PowerShell で、次を実行する

```powershell
pnpm exec wrangler r2 object put photogallery-media/sample.png --file=.\sample.png --local
```

ここまでで画面に「ローカルプレビュー」と `sample.png` が出る。このとき R2 はローカルの模擬バケット。Access は通らない。

Cloudflare R2 の画像と動画を、Workers の非公開ギャラリーで見る。入口は Cloudflare Access の Google ログイン。

## テスト

1 ファイルだけ指定する。所要は約 1 分。

```powershell
pnpm test run test/media.test.ts
pnpm test run test/page.test.ts
```

## Cloudflare へ出す

初回は約 45 分。トークンと Google の OAuth クライアントが既にあるなら約 10 分。

### 1. `.env` を作る

リポジトリのルートで `.env.example` を `.env` にコピーして埋める。mise がこのファイルを環境変数として読む。ファイルはコミットしない。`.env` がまだ無くても、ローカルプレビューは動く。

`CLOUDFLARE_API_TOKEN` には、次の 4 つを付けた Cloudflare の API トークンを書く。

1. Workers Scripts の Read と Write
2. Workers R2 Storage の Write
3. Access の Apps and Policies の Write
4. Access の Organizations, Identity Providers, and Groups の Write

写真を上げるときの R2 キーも、同じファイルの `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` に書く。Google のクライアント ID とシークレットはここには書かず、`terraform.tfvars` に置く。

### 2. Google ログインを作る

1. Google Cloud で OAuth クライアント（ウェブアプリケーション）を作る(any-projectで作成済み)
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

作るものは R2 バケット、空の Worker、Google の Identity Provider、その Worker を守る Access アプリケーション。公開先は `workers.dev` だけ。Access の宛先は Worker そのものなので、`workers.dev` もプレビューも同じポリシーの奥に入る。

### 4. Worker のコードを出す

リポジトリのルートに戻って実行する。

```powershell
pnpm deploy
```

### 5. 写真を上げる

1. ダッシュボードの R2 > Manage R2 API Tokens で、対象バケットへの Object Read & Write を持つ S3 互換キーを作る。このキーは Terraform の API トークンとは別
2. `.env` の `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` を埋める
3. フォルダの直下だけを上げる

```powershell
pnpm upload D:\photos\2024-trip
```

サブフォルダは見ない。拡張子は jpg, jpeg, png, gif, webp, avif, heic, heif, mp4, mov, webm, m4v。`.` で始まる名前は除く。オブジェクトキーはファイル名。同名は上書きする。

Windows のブラウザは HEIC / HEIF を表示できないことが多い。ファイル自体は置ける。

## 名前と役割

バケット名と Worker 名は `infra/terraform/main.tf` の `locals` に固定してある。`wrangler.jsonc` の `name` と `bucket_name` も同じ値にする。`.env` の `R2_BUCKET_NAME` も同じバケット名にする。

| もの                    | 役割                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| R2 `photogallery-media` | 非公開の画像・動画。場所の希望は `apac`                                     |
| Worker `photogallery`   | 一覧と配信。R2 はバインディング経由で読む                                   |
| Access                  | Worker 全体（`workers.dev` とプレビューを含む）を Google ログインの奥に置く |
| `scripts/upload.ts`     | 指定フォルダの直下だけを R2 の S3 API へ上げる                              |

バケットは公開しない。ブラウザは Worker の `/media/...` だけを見る。

Workers の実行言語は JavaScript / TypeScript が第一級。Python は対応範囲が狭く、Go はそのままでは動かない。Worker もアップロードスクリプトも TypeScript。

Cloudflare には AWS CloudFormation に当たるスタックサービスはない。インフラは Terraform の公式プロバイダ（v5）。Worker のソース配置だけは Wrangler。Terraform がバージョンまで持つと、デプロイのたびに両方が同じ Worker を取り合う。

ツールは [mise](https://mise.jdx.dev/) が Node.js 22、pnpm 10、Terraform 1.10 を入れる。

## 画面

- `/` ギャラリー
- `/api/media` 一覧 JSON
- `/media/<key>` 本体。動画のシーク用に Range を返す

ログイン済みのときは `Cf-Access-Authenticated-User-Email` を見出しに出す。本番の拒否は Access が先に行う。

今の画面は、フォルダ直下から上げたファイルを新しいアップロード順に並べる。

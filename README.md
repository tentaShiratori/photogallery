# フォトギャラリー

Cloudflare R2 に置いた画像と動画を、Cloudflare Workers の非公開ギャラリーで見る。入口の認証は Cloudflare Access の Google ログイン。

撮影年で分ける機能はまだない。ファイルは iPhone か Android で撮って Windows にコピーしたものなので、ファイルの更新日時は撮影日にならない。後から EXIF の `DateTimeOriginal` や動画の QuickTime `CreateDate` を読んで、撮影年ごとの一覧にする想定。今の画面はフォルダ直下から上げたファイルを、新しいアップロード順に並べるだけ。

## 構成

Workers の実行言語は JavaScript / TypeScript が第一級で、Python は対応範囲が狭く、Go はそのままでは動かない。そのため Worker もアップロードスクリプトも TypeScript。

Cloudflare には AWS CloudFormation に当たるスタックサービスはない。インフラは Terraform の公式プロバイダ（v5）で定義する。Worker のソース配置だけは Wrangler に任せる。Terraform がバージョンまで持つと、デプロイのたびに両方が同じ Worker を取り合う。

| もの | 役割 |
| --- | --- |
| R2 `photogallery-media` | 非公開の画像・動画。場所の希望は `apac` |
| Worker `photogallery` | 一覧と配信。R2 はバインディング経由で読む |
| Access | Worker 全体（`workers.dev` とプレビューを含む）を Google ログインの奥に置く |
| `scripts/upload.ts` | 指定フォルダの直下だけを R2 の S3 API へ上げる |

バケットは公開しない。ブラウザは Worker の `/media/...` だけを見る。

## ツール

[mise](https://mise.jdx.dev/) で Node.js 22、pnpm 10、Terraform 1.10 を入れる。

```powershell
mise install
pnpm install
```

## ローカルで見る

```powershell
pnpm dev
```

`http://localhost:8787` を開く。このとき R2 はローカルの模擬バケットで、Access は通らない。画面には「ローカルプレビュー」と出る。

試しに 1 枚入れる:

```powershell
pnpm exec wrangler r2 object put photogallery-media/sample.png --file=.\sample.png --local
```

## テスト

ファイルを指定して実行する。

```powershell
pnpm test run test/media.test.ts
pnpm test run test/page.test.ts
```

## Cloudflare へ出す

### 1. API トークン

Cloudflare の API トークンに、少なくとも次を付ける。

- Workers Scripts の Read と Write
- Workers R2 Storage の Write
- Access の Apps and Policies の Write
- Access の Organizations, Identity Providers, and Groups の Write

シェルに `CLOUDFLARE_API_TOKEN` を置く。トークンはリポジトリに置かない。

### 2. Google ログイン

Google Cloud で OAuth クライアント（ウェブアプリケーション）を作る。承認済みリダイレクト URI は次の形。

`https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`

`<team-name>` は Zero Trust のチーム名。クライアント ID とシークレットは `infra/terraform/terraform.tfvars` に書く。`terraform.tfvars.example` をコピーして、見られてよい Google アカウントを `allowed_emails` に入れる。

### 3. Terraform

```powershell
cd infra\terraform
copy terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

作るものは R2 バケット、空の Worker、Google の Identity Provider、その Worker を守る Access アプリケーション。カスタムホスト名が要るときだけ `custom_hostname` と `zone_id` を両方書く。書かなければ `workers.dev` だけで動く。Access の宛先は Worker そのものなので、付いたホスト名も同じポリシーの奥に入る。

`bucket_name` と `worker_name` を変えたら、`wrangler.jsonc` の `name` と `bucket_name` も同じ値にする。

### 4. Worker のコード

```powershell
pnpm deploy
```

### 5. アップロード用のキー

ダッシュボードの R2 > Manage R2 API Tokens で、対象バケットへの Object Read & Write を持つ S3 互換キーを作る。`.env.example` を `.env` にコピーして埋める。このキーは Terraform の API トークンとは別。

```powershell
pnpm upload -- D:\photos\2024-trip
```

対象はそのフォルダの直下にあるファイルだけ。サブフォルダは見ない。拡張子は jpg, jpeg, png, gif, webp, avif, heic, heif, mp4, mov, webm, m4v。隠しファイル（`.` で始まる名前）は除く。オブジェクトキーはファイル名。同名は上書きする。

Windows のブラウザは HEIC / HEIF を表示できないことが多い。ファイル自体は置ける。

## 画面

- `/` ギャラリー
- `/api/media` 一覧 JSON
- `/media/<key>` 本体。動画のシーク用に Range を返す

ログイン済みのときは `Cf-Access-Authenticated-User-Email` を見出しに出す。本番の拒否は Access が先に行う。

## 追加機能メモ: 撮影年

やりたいことは、ギャラリーを撮影年ごとに分けること。実装はしていない。

撮影日時は画像の EXIF `DateTimeOriginal`、動画の QuickTime / ISO BMFF の作成日時から取る。iPhone と Android のファイルを Windows に落とすと、エクスプローラー上の作成日時や更新日時はコピーした日時になりやすいので、ファイルシステム日時では年を決めない。取れた年をオブジェクトキーの先頭（例: `2024/IMG_0001.jpg`）にするか、アップロード時にカスタムメタデータへ入れる。ギャラリーはその年で見出しを分ける。日時が読めないファイルは「年不明」にまとめる。

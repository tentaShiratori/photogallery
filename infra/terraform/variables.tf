variable "account_id" {
  type        = string
  description = "Cloudflare アカウント ID。"
}

variable "bucket_name" {
  type        = string
  description = "画像と動画を置く R2 バケット名。wrangler.jsonc の bucket_name と揃える。"
  default     = "photogallery-media"
}

variable "worker_name" {
  type        = string
  description = "Worker 名。wrangler.jsonc の name と揃える。"
  default     = "photogallery"
}

variable "google_client_id" {
  type        = string
  description = "Google OAuth クライアント ID。Access のログインに使う。"
}

variable "google_client_secret" {
  type        = string
  sensitive   = true
  description = "Google OAuth クライアントシークレット。"
}

variable "allowed_emails" {
  type        = list(string)
  description = "ギャラリーを開いてよい Google アカウントのメールアドレス。"

  validation {
    condition     = length(var.allowed_emails) > 0
    error_message = "allowed_emails に 1 件以上のメールアドレスが必要です。"
  }
}

variable "custom_hostname" {
  type        = string
  description = "任意。Worker に付けるカスタムホスト名。zone_id とセットで指定する。"
  default     = ""
}

variable "zone_id" {
  type        = string
  description = "任意。custom_hostname が属する Cloudflare ゾーン ID。"
  default     = ""
}

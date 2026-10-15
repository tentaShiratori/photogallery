variable "account_id" {
  type        = string
  description = "Cloudflare アカウント ID。"
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

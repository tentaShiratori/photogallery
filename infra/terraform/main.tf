resource "terraform_data" "hostname_pair" {
  lifecycle {
    precondition {
      condition     = (var.custom_hostname == "" && var.zone_id == "") || (var.custom_hostname != "" && var.zone_id != "")
      error_message = "custom_hostname と zone_id は両方指定するか、両方空にしてください。"
    }
  }
}

resource "cloudflare_r2_bucket" "media" {
  account_id    = var.account_id
  name          = var.bucket_name
  location      = "apac"
  storage_class = "Standard"
}

resource "cloudflare_worker" "gallery" {
  account_id = var.account_id
  name       = var.worker_name

  subdomain = {
    enabled          = true
    previews_enabled = true
  }

  observability = {
    enabled = true
  }
}

resource "cloudflare_workers_custom_domain" "gallery" {
  count = var.custom_hostname != "" ? 1 : 0

  account_id = var.account_id
  hostname   = var.custom_hostname
  service    = cloudflare_worker.gallery.name
  zone_id    = var.zone_id
}

resource "cloudflare_zero_trust_access_identity_provider" "google" {
  account_id = var.account_id
  name       = "Google"
  type       = "google"

  config = {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
  }
}

resource "cloudflare_zero_trust_access_application" "gallery" {
  account_id                = var.account_id
  name                      = "photogallery"
  type                      = "self_hosted"
  session_duration          = "24h"
  auto_redirect_to_identity = true
  app_launcher_visible      = true
  allowed_idps              = [cloudflare_zero_trust_access_identity_provider.google.id]

  destinations = [{
    type      = "worker"
    worker_id = cloudflare_worker.gallery.id
  }]

  policies = [{
    name       = "allow-listed-google-emails"
    decision   = "allow"
    precedence = 1
    include = [
      for email in var.allowed_emails : {
        email = {
          email = email
        }
      }
    ]
  }]
}

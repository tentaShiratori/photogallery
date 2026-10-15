locals {
  bucket_name = "photogallery-media"
  worker_name = "photogallery"
}

resource "cloudflare_r2_bucket" "media" {
  account_id    = var.account_id
  name          = local.bucket_name
  location      = "apac"
  storage_class = "Standard"
}

resource "cloudflare_worker" "gallery" {
  account_id = var.account_id
  name       = local.worker_name

  subdomain = {
    enabled          = true
    previews_enabled = true
  }

  observability = {
    enabled = true
  }
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

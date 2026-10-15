output "bucket_name" {
  value = cloudflare_r2_bucket.media.name
}

output "worker_name" {
  value = cloudflare_worker.gallery.name
}

output "worker_id" {
  value = cloudflare_worker.gallery.id
}

output "workers_dev_url" {
  value = cloudflare_worker.gallery.subdomain.url
}

output "custom_hostname" {
  value = var.custom_hostname != "" ? var.custom_hostname : null
}

terraform {
  required_version = ">= 1.16.0"

  backend "s3" {
    bucket = "tenta-tfstate"
    key    = "photogallery"
    region = "ap-northeast-1"
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {}

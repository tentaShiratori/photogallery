/// <reference types="vite/client" />

declare global {
  namespace Cloudflare {
    interface Env {
      MEDIA: R2Bucket;
      ASSETS: Fetcher;
    }

    interface GlobalProps {
      mainModule: typeof import("./server.ts");
    }
  }
}

export {};

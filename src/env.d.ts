declare global {
  namespace Cloudflare {
    interface Env {
      MEDIA: R2Bucket;
    }

    interface GlobalProps {
      mainModule: typeof import("./index.ts");
    }
  }
}

export {};

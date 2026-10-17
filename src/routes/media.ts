import { contentTypeForName, byteContentRange, keyFromMediaPath, kindForName } from "../lib/media";
import { AppHanlder } from "../lib/types";

export async function serveObject(
  request: Request,
  bucket: R2Bucket,
  key: string,
): Promise<Response> {
  const range = request.headers.get("Range");
  const object = await bucket.get(key, range ? { range: request.headers } : undefined);
  if (object === null) {
    return new Response("見つかりません。", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", contentTypeForName(key));
  }
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600");

  if (range && object.range) {
    const contentRange = byteContentRange(object.range, object.size);
    if (contentRange) {
      headers.set("content-range", contentRange);
      return new Response(object.body, { status: 206, headers });
    }
  }

  return new Response(object.body, { headers });
}

export const get: AppHanlder = async (c) => {
  const key = keyFromMediaPath(c.req.path);
  if (!key || !kindForName(key)) {
    return c.text("見つかりません。", 404);
  }
  return serveObject(c.req.raw, c.env.MEDIA, key);
};

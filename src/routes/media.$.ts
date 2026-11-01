import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getMedia } from "../lib/serve-media";

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      GET: ({ request }) => getMedia(request, env.MEDIA),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getApiMedia } from "../../lib/get-api-media";

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      GET: ({ request }) => getApiMedia(request, env.MEDIA),
    },
  },
});

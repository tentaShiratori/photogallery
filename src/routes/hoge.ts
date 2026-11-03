import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hoge")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ hoge: "hoge" });
      },
    },
  },
});

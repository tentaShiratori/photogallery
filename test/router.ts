import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

export function loadServerResponse(request: Request) {
  return createStartHandler(defaultStreamHandler)(request);
}

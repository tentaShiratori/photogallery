import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const getAccessEmail = createServerOnlyFn(() => getRequestHeader("Cf-Access-Authenticated-User-Email") ?? null);

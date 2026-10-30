import type { Page, Response } from "playwright-core";
import type { ServerTiming } from "./types.ts";

function parseServerTiming(header: string | null): ServerTiming | null {
  if (header === null || header.trim() === "") return null;
  let r2Calls: number | null = null;
  let r2Ms: number | null = null;
  let totalMs: number | null = null;
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const [nameToken, ...paramTokens] = trimmed.split(";").map((token) => token.trim());
    const name = nameToken.toLowerCase();
    let dur: number | null = null;
    let desc: string | null = null;
    for (const param of paramTokens) {
      const eq = param.indexOf("=");
      if (eq < 0) continue;
      const key = param.slice(0, eq).trim().toLowerCase();
      let value = param.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (key === "dur") dur = Number(value);
      if (key === "desc") desc = value;
    }
    if (name === "r2") {
      if (dur !== null && Number.isFinite(dur)) r2Ms = dur;
      if (desc !== null && /^\d+$/.test(desc)) r2Calls = Number(desc);
    }
    if (name === "total" && dur !== null && Number.isFinite(dur)) totalMs = dur;
  }
  if (r2Calls === null || r2Ms === null || totalMs === null) return null;
  return { r2Calls, r2Ms, totalMs };
}

export function attachServerTimingListener(page: Page, wantYear: boolean): { readonly take: () => ServerTiming } {
  let latest: ServerTiming | null = null;
  const onResponse = (response: Response) => {
    try {
      const requestUrl = new URL(response.url());
      if (!requestUrl.pathname.endsWith("/api/media")) return;
      const hasYear = requestUrl.searchParams.has("year");
      if (hasYear !== wantYear) return;
      const timing = parseServerTiming(response.headers()["server-timing"] ?? null);
      if (timing) latest = timing;
    } catch {
      // ignore unrelated responses
    }
  };
  page.on("response", onResponse);
  return {
    take: () => {
      page.off("response", onResponse);
      if (latest === null) {
        const which = wantYear ? "year あり" : "year なし";
        throw new Error(`Server-Timing を /api/media（${which}）から取れませんでした。`);
      }
      return latest;
    },
  };
}

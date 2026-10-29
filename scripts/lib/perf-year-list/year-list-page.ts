import { type Page, type Response } from "playwright-core";

const MARK_LOADING = "year-list-loading";
const MARK_API = "year-list-api";
const MARK_READY = "year-list-ready";

export type ClientMarks = {
  readonly loadingMs: number;
  readonly apiMs: number;
  readonly readyMs: number;
};

export type ServerTiming = {
  readonly r2Calls: number;
  readonly r2Ms: number;
  readonly totalMs: number;
};

function isAccessUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
  } catch {
    return false;
  }
}

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

/** Playwright page object for the year-list gallery surface. */
export class YearListPage {
  constructor(readonly page: Page) {}

  isOnAccess(): boolean {
    return isAccessUrl(this.page.url());
  }

  async openForAccess(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  }

  async openForMeasure(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "commit", timeout: 120_000 });
  }

  async waitForShell(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const titleOk = document.title.includes("フォトギャラリー");
        const host = location.hostname;
        const access = host.includes("cloudflareaccess.com") || host.includes("accounts.google.com");
        return titleOk && !access;
      },
      { timeout: 10 * 60 * 1000 },
    );
  }

  async clearCache(): Promise<void> {
    const session = await this.page.context().newCDPSession(this.page);
    await session.send("Network.enable");
    await session.send("Network.clearBrowserCache");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  }

  async collectMarks(): Promise<ClientMarks> {
    await this.page.waitForFunction(
      (names: readonly string[]) => names.every((name) => performance.getEntriesByName(name).length > 0),
      [MARK_LOADING, MARK_API, MARK_READY],
      { timeout: 120_000 },
    );
    return this.page.evaluate(
      (names) => {
        const read = (name: string) => {
          const entry = performance.getEntriesByName(name)[0];
          if (!entry) throw new Error(`missing mark: ${name}`);
          return entry.startTime;
        };
        return {
          loadingMs: read(names.loading),
          apiMs: read(names.api),
          readyMs: read(names.ready),
        };
      },
      { loading: MARK_LOADING, api: MARK_API, ready: MARK_READY },
    );
  }

  attachServerTimingListener(): { readonly take: () => ServerTiming } {
    let latest: ServerTiming | null = null;
    const onResponse = (response: Response) => {
      try {
        const requestUrl = new URL(response.url());
        if (!requestUrl.pathname.endsWith("/api/media")) return;
        if (requestUrl.searchParams.has("year")) return;
        const timing = parseServerTiming(response.headers()["server-timing"] ?? null);
        if (timing) latest = timing;
      } catch {
        // ignore unrelated responses
      }
    };
    this.page.on("response", onResponse);
    return {
      take: () => {
        this.page.off("response", onResponse);
        if (latest === null) {
          throw new Error("Server-Timing を /api/media（year なし）から取れませんでした。");
        }
        return latest;
      },
    };
  }
}

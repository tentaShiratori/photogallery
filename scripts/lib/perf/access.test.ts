import { describe, expect, it, vi } from "vite-plus/test";
import { ensureAccess, pageIsOnAccess } from "./access.ts";

describe("pageIsOnAccess", () => {
  it("Access と Google を判定し、壊れた URL は false", () => {
    expect(pageIsOnAccess("https://foo.cloudflareaccess.com/cdn-cgi/access/login")).toBe(true);
    expect(pageIsOnAccess("https://accounts.google.com/o/oauth2")).toBe(true);
    expect(pageIsOnAccess("https://example.test/")).toBe(false);
    expect(pageIsOnAccess("not a url")).toBe(false);
  });
});

describe("ensureAccess", () => {
  it("Access 上で headless ならログインを促して失敗する", async () => {
    const page = {
      goto: vi.fn(async () => undefined),
      url: () => "https://foo.cloudflareaccess.com/login",
      waitForFunction: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const context = { newPage: async () => page };
    await expect(ensureAccess(context as never, "https://gallery.test/", false)).rejects.toThrow(
      "Cloudflare Access のログインが必要です",
    );
    expect(page.close).toHaveBeenCalled();
  });

  it("ギャラリーに入れたら ready 印を書く", async () => {
    const written: string[] = [];
    const page = {
      goto: vi.fn(async () => undefined),
      url: () => "https://gallery.test/",
      waitForFunction: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const context = { newPage: async () => page };
    await ensureAccess(context as never, "https://gallery.test/", true, {
      mkdirSync: () => undefined as never,
      writeFileSync: (target) => {
        written.push(String(target));
      },
    });
    expect(written.some((path) => path.includes(".access-ready"))).toBe(true);
    expect(page.close).toHaveBeenCalled();
  });

  it("画面ありでログインを待ち、タイトルが違えば印を書かない", async () => {
    const originalDocument = globalThis.document;
    const originalLocation = globalThis.location;
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = (message?: unknown) => {
      errors.push(message);
    };
    globalThis.document = { title: "フォトギャラリー" } as Document;
    globalThis.location = { hostname: "gallery.example" } as Location;
    const written: string[] = [];
    const page = {
      goto: async () => undefined,
      url: () => "https://accounts.google.com/signin",
      waitForFunction: async (fn: () => boolean) => {
        expect(fn()).toBe(true);
      },
      close: async () => undefined,
    };
    try {
      await ensureAccess({ newPage: async () => page } as never, "https://gallery.example/", true, {
        mkdirSync: () => undefined as never,
        writeFileSync: (target) => {
          written.push(String(target));
        },
      });
      expect(errors).toEqual(["Cloudflare Access にログインしてください。完了すると計測に進みます…"]);
      expect(written).toHaveLength(1);

      globalThis.document = { title: "Login" } as Document;
      const blocked = {
        ...page,
        url: () => "https://gallery.example/",
        waitForFunction: async (fn: () => boolean) => {
          if (!fn()) throw new Error("not ready");
        },
      };
      await expect(
        ensureAccess({ newPage: async () => blocked } as never, "https://gallery.example/", false, {
          mkdirSync: () => undefined as never,
          writeFileSync: () => {
            throw new Error("should not write");
          },
        }),
      ).rejects.toThrow("not ready");
    } finally {
      console.error = originalError;
      globalThis.document = originalDocument;
      globalThis.location = originalLocation;
    }
  });
});

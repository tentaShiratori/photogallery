import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./client";
import { mediaItem, yearCard } from "./media.fixtures.ts";

describe("Gallery", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年の一覧を出し、年を開くと年の画面になる", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("year=")) {
          return Response.json({
            group: {
              label: "2024",
              truncated: false,
              items: [mediaItem("2024", 0), mediaItem("2024", 1)],
            },
            next: null,
          });
        }
        return Response.json({ years: [yearCard("2024", 2)] });
      }),
    );
    render(<Gallery />);
    await user.click(await screen.findByRole("button", { name: "2024" }));
    expect(await screen.findByRole("button", { name: "← 年の一覧へ" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2024-0.jpg" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "← 年の一覧へ" }));
    expect(await screen.findByRole("button", { name: "2024" })).toBeTruthy();
  });
});

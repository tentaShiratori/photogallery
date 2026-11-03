import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mediaItem } from "../media.fixtures.ts";
import { YearScreen } from "./YearScreen";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});
const yearRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/years/$year",
  component: () => <YearScreen yearToken="2024" />,
});
const routeTree = rootRoute.addChildren([indexRoute, yearRoute]);

describe("YearScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("戻るリンクとタイルを出す", async () => {
    const item = mediaItem("2024", 0);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          group: {
            label: "2024",
            truncated: false,
            items: [item],
          },
          next: null,
        }),
      ),
    );
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/years/2024"] }),
    });
    render(<RouterProvider router={router} />);
    const back = await screen.findByRole("link", { name: "← 年の一覧へ" });
    expect(back.getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: item.caption })).toBeTruthy();
  });
});

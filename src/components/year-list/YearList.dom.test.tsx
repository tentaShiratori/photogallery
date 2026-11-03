import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { yearCard } from "../media.fixtures.ts";
import { YearList } from "./YearList";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: YearList,
});
const yearRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/years/$year",
});
const routeTree = rootRoute.addChildren([indexRoute, yearRoute]);

describe("YearList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("年カードのリンクを /years/2024 にする", async () => {
    const card = yearCard("2024", 1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          years: [card],
        }),
      ),
    );
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);
    const link = await screen.findByRole("link", { name: card.label });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });
});

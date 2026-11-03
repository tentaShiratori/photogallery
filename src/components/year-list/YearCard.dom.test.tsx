import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { yearCard } from "../media.fixtures.ts";
import { YearCard } from "./YearCard";
import type { ParsedYearCard } from "../feed";

let cardUnderTest: ParsedYearCard;

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <YearCard card={cardUnderTest} />,
});
const yearRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/years/$year",
});
const routeTree = rootRoute.addChildren([indexRoute, yearRoute]);

describe("YearCard", () => {
  it("年ラベルのリンクを /years/2024 にする", async () => {
    cardUnderTest = yearCard("2024", 2);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);
    const link = await screen.findByRole("link", { name: cardUnderTest.label });
    expect(link.getAttribute("href")).toBe("/years/2024");
  });

  it("年不明のリンクを /years/unknown にする", async () => {
    cardUnderTest = yearCard("年不明", 1);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);
    const link = await screen.findByRole("link", { name: cardUnderTest.label });
    expect(link.getAttribute("href")).toBe("/years/unknown");
  });
});

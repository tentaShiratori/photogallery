import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type AnyRouter,
} from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

export type RouterWrapperOptions = {
  readonly initialEntries?: readonly string[];
};

function buildTestRouter(initialEntries: readonly string[]): AnyRouter {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const yearRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/years/$year",
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, yearRoute]),
    history: createMemoryHistory({ initialEntries: [...initialEntries] }),
  });
}

/** testing-library の `render(..., { wrapper })` 向け。Link などが動く Router 文脈を渡す。 */
export function createRouterWrapper(options: RouterWrapperOptions = {}): ComponentType<{ children: ReactNode }> {
  const router = buildTestRouter(options.initialEntries ?? ["/"]);
  return function RouterWrapper({ children }: { children: ReactNode }) {
    return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
  };
}

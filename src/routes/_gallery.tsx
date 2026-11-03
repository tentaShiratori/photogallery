import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GalleryChrome, getAccessEmail } from "../components/GalleryChrome";
import { YearListProvider } from "../components/year-list/YearListContext";

export const Route = createFileRoute("/_gallery")({
  component: GalleryLayout,
  // Layout stays mounted for in-app moves between the year list and a year screen,
  // so this only runs on SSR of the gallery shell.
  loader: getAccessEmail,
});

function GalleryLayout() {
  const email = Route.useLoaderData();
  return (
    <GalleryChrome email={email}>
      <YearListProvider>
        <Outlet />
      </YearListProvider>
    </GalleryChrome>
  );
}

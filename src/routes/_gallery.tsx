import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GalleryShell } from "../components/gallery-shell";
import { getAccessEmail } from "../lib/access-email";

export const Route = createFileRoute("/_gallery")({
  component: GalleryLayout,
  // Layout stays mounted across year list ↔ year screen, so this only runs on SSR
  // of the first gallery route (or a full reload).
  loader: getAccessEmail,
});

function GalleryLayout() {
  const email = Route.useLoaderData();
  return (
    <GalleryShell email={email}>
      <Outlet />
    </GalleryShell>
  );
}

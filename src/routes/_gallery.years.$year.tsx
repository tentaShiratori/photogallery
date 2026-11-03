import { createFileRoute, notFound } from "@tanstack/react-router";
import * as v from "valibot";
import { yearQuerySchema } from "../lib/media";
import { YearScreen } from "../components/year-screen/YearScreen";

export const Route = createFileRoute("/_gallery/years/$year")({
  beforeLoad: ({ params }) => {
    if (!v.safeParse(yearQuerySchema, params.year).success) throw notFound();
  },
  component: YearRoute,
});

function YearRoute() {
  const { year } = Route.useParams();
  return <YearScreen yearToken={year} />;
}

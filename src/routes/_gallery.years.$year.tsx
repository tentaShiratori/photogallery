import { createFileRoute, notFound } from "@tanstack/react-router";
import * as v from "valibot";
import { YearScreen } from "../components/year-screen/YearScreen";
import { yearQuerySchema } from "../lib/media/year";

export const Route = createFileRoute("/_gallery/years/$year")({
  params: {
    parse: (raw) => {
      const result = v.safeParse(yearQuerySchema, raw.year);
      if (!result.success) throw notFound();
      return { year: raw.year };
    },
  },
  component: YearScreenPage,
});

function YearScreenPage() {
  const { year } = Route.useParams();
  return <YearScreen yearToken={year} />;
}

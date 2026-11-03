import { createFileRoute, notFound } from "@tanstack/react-router";
import * as v from "valibot";
import { YearScreen } from "../../components/year-screen/YearScreen";
import { yearQuerySchema } from "../../lib/media";

export const Route = createFileRoute("/_gallery/years/$year")({
  beforeLoad: ({ params }) => {
    if (!v.safeParse(yearQuerySchema, params.year).success) {
      throw notFound();
    }
  },
  component: YearPage,
});

function YearPage() {
  const { year } = Route.useParams();
  return <YearScreen yearToken={year} />;
}

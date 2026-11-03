import { createFileRoute, redirect } from "@tanstack/react-router";
import { YearList } from "../../components/year-list/YearList";

type IndexSearch = {
  year?: string;
};

export const Route = createFileRoute("/_gallery/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const year = search.year;
    return typeof year === "string" && year.length > 0 ? { year } : {};
  },
  beforeLoad: ({ search }) => {
    if (search.year !== undefined) {
      throw redirect({
        to: "/years/$year",
        params: { year: search.year },
        replace: true,
      });
    }
  },
  component: YearList,
});

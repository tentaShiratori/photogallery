import { createFileRoute, redirect } from "@tanstack/react-router";
import { YearList } from "../components/year-list/YearList";

export const Route = createFileRoute("/_gallery/")({
  beforeLoad: ({ location }) => {
    const year = new URLSearchParams(location.searchStr).get("year");
    if (year != null && year.length > 0) {
      throw redirect({
        to: "/years/$year",
        params: { year },
        replace: true,
      });
    }
  },
  component: YearList,
});

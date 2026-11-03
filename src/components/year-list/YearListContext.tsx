import { createContext, useContext, type ReactNode } from "react";
import type { YearListView } from "../feed";
import { useYearList } from "../useYearList";

const YearListContext = createContext<YearListView | null>(null);

export function YearListProvider({ children }: { children: ReactNode }) {
  const listView = useYearList();
  return <YearListContext.Provider value={listView}>{children}</YearListContext.Provider>;
}

export function useYearListView(): YearListView {
  const value = useContext(YearListContext);
  if (value === null) throw new Error("YearListProvider is required");
  return value;
}

import { describe, expect, it } from "vite-plus/test";
import { render } from "@testing-library/react";
import { useYearListView } from "./YearListContext";

describe("YearListContext", () => {
  it("Provider なしでは失敗する", () => {
    function Probe() {
      useYearListView();
      return null;
    }
    expect(() => render(<Probe />)).toThrow("YearListProvider is required");
  });
});

import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ThumbUrl } from "../lib/name/types.ts";
import { MediaTile } from "./MediaTile";

describe("MediaTile", () => {
  it("キャプションを出し、クリックで onClick する", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <MediaTile
        kind="image"
        thumbUrl={"/media/t/shot.webp" as ThumbUrl}
        caption="shot.jpg"
        onClick={() => {
          clicks += 1;
        }}
      />,
    );
    expect(screen.getByText("shot.jpg")).toBeTruthy();
    const button = screen.getByRole("button", { name: "shot.jpg" });
    expect(button.getAttribute("data-kind")).toBe("image");
    await user.click(button);
    expect(clicks).toBe(1);
  });
});

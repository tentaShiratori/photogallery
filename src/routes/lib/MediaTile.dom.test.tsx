import { afterEach, describe, expect, it } from "vite-plus/test";
import type { ThumbUrl } from "../../lib/name/types.ts";
import { clearDom, mountDom } from "./dom-test.fixtures.tsx";
import { MediaTile } from "./MediaTile";

describe("MediaTile", () => {
  afterEach(() => {
    clearDom();
  });

  it("キャプションを出し、クリックで onClick する", () => {
    let clicks = 0;
    const root = mountDom(
      <MediaTile
        kind="image"
        thumbUrl={"/media/t/shot.webp" as ThumbUrl}
        caption="shot.jpg"
        onClick={() => {
          clicks += 1;
        }}
      />,
    );
    expect(root.textContent).toContain("shot.jpg");
    const button = root.querySelector("button");
    expect(button?.getAttribute("data-kind")).toBe("image");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);
  });
});

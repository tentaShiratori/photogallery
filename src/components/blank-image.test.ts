import { describe, expect, it } from "vite-plus/test";
import { BLANK_IMAGE_SRC, blankBrokenImage } from "./blank-image.ts";

describe("blankBrokenImage", () => {
  it("data URL の白画像に差し替え、再エラーは無視する", () => {
    const img = { src: "/media/t/x.webp", onerror: () => undefined } as unknown as HTMLImageElement;
    blankBrokenImage({ currentTarget: img });
    expect(img.src).toBe(BLANK_IMAGE_SRC);
    expect(img.onerror).toBeNull();
    blankBrokenImage({ currentTarget: img });
    expect(img.src).toBe(BLANK_IMAGE_SRC);
  });
});

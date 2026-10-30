import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { waitForRootThumbs } from "./wait-thumbs";

describe("waitForRootThumbs", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("対象の img が無ければすぐ終わる", async () => {
    const root = document.createElement("div");
    root.id = "empty-root";
    document.body.append(root);
    await expect(waitForRootThumbs("empty-root")).resolves.toBeUndefined();
  });

  it("complete な img を待って終わる", async () => {
    const root = document.createElement("div");
    root.id = "thumbs-root";
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: true });
    Object.defineProperty(img, "currentSrc", { value: "http://localhost/t.webp" });
    root.append(img);
    document.body.append(root);
    await expect(waitForRootThumbs("thumbs-root")).resolves.toBeUndefined();
  });

  it("limit で先頭だけ待つ", async () => {
    const root = document.createElement("div");
    root.id = "limited-root";
    for (let i = 0; i < 3; i++) {
      const img = document.createElement("img");
      Object.defineProperty(img, "complete", { value: true });
      Object.defineProperty(img, "currentSrc", { value: `http://localhost/${i}.webp` });
      root.append(img);
    }
    document.body.append(root);
    await expect(waitForRootThumbs("limited-root", 1)).resolves.toBeUndefined();
  });
});

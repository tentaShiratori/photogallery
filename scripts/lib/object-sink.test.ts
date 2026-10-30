import { describe, expect, it } from "vite-plus/test";
import { BUCKET_DISPLAY_NAME, destinationLine } from "./object-sink.ts";

describe("destinationLine", () => {
  it("ローカルと本番でバケット名と件数を出す", () => {
    expect(BUCKET_DISPLAY_NAME).toBe("photogallery-media");
    expect(destinationLine("local", 3)).toBe("ローカルの photogallery-media へ 3 件");
    expect(destinationLine("prd", 1)).toBe("本番の photogallery-media へ 1 件");
  });
});

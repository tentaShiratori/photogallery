import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { BodyUrl } from "../../lib/name/types.ts";
import { clearDom, mountDom } from "./dom-test.fixtures.tsx";
import { MediaViewer } from "./MediaViewer";

describe("MediaViewer", () => {
  afterEach(() => {
    clearDom();
    vi.restoreAllMocks();
  });

  it("画像の拡大表示を開き、閉じるで onClose する", async () => {
    let closed = 0;
    const root = mountDom(
      <MediaViewer
        item={{ bodyUrl: "/media/shot.jpg" as BodyUrl, kind: "image", caption: "shot.jpg" }}
        onClose={() => {
          closed += 1;
        }}
      />,
    );
    const dialog = root.querySelector("#viewer") as HTMLDialogElement;
    await vi.waitFor(() => {
      expect(dialog.open).toBe(true);
    });
    expect(root.textContent).toContain("shot.jpg");
    root.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(closed).toBe(1);
  });

  it("動画のときは video を出す", async () => {
    const root = mountDom(
      <MediaViewer
        item={{ bodyUrl: "/media/clip.mp4" as BodyUrl, kind: "video", caption: "clip.mp4" }}
        onClose={() => undefined}
      />,
    );
    await vi.waitFor(() => {
      expect(root.querySelector("video")).not.toBeNull();
    });
    expect(root.querySelector("#stage img")).toBeNull();
  });

  it("item が null のときは閉じたまま", async () => {
    const root = mountDom(<MediaViewer item={null} onClose={() => undefined} />);
    await Promise.resolve();
    await Promise.resolve();
    const dialog = root.querySelector("#viewer") as HTMLDialogElement;
    expect(dialog.open).toBe(false);
  });
});

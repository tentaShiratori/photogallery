import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BodyUrl } from "../lib/name/types.ts";
import { MediaViewer } from "./MediaViewer";

describe("MediaViewer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("画像の拡大表示を開き、閉じるで onClose する", async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(
      <MediaViewer
        item={{ bodyUrl: "/media/shot.jpg" as BodyUrl, kind: "image", caption: "shot.jpg" }}
        onClose={() => {
          closed += 1;
        }}
      />,
    );
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("shot.jpg")).toBeTruthy();
    expect(screen.getByAltText("shot.jpg")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(closed).toBe(1);
  });

  it("動画のときは video を出す", async () => {
    render(
      <MediaViewer
        item={{ bodyUrl: "/media/clip.mp4" as BodyUrl, kind: "video", caption: "clip.mp4" }}
        onClose={() => undefined}
      />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector("video")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("clip.mp4")).toBeTruthy();
  });

  it("item が null のときは閉じたまま", () => {
    render(<MediaViewer item={null} onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();
  });
});

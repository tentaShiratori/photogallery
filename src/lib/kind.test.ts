import { describe, expect, it } from "vite-plus/test";
import {
  byteContentRange,
  contentTypeForName,
  escapeHtml,
  keyFromMediaPath,
  kindForName,
  mediaPath,
  selectUploadNames,
} from "./kind.ts";

describe("media kinds", () => {
  it("画像と動画の拡張子を分類する", () => {
    expect(kindForName("IMG_0001.JPG")).toBe("image");
    expect(kindForName("clip.MOV")).toBe("video");
    expect(kindForName("notes.txt")).toBeNull();
    expect(kindForName("archive.tar.gz")).toBeNull();
  });

  it("Content-Type を拡張子から決める", () => {
    expect(contentTypeForName("a.heic")).toBe("image/heic");
    expect(contentTypeForName("b.m4v")).toBe("video/x-m4v");
  });

  it("フォルダ直下の名前から画像と動画だけを選ぶ", () => {
    expect(selectUploadNames(["a.jpg", "b.MP4", "c.txt", ".hidden.png", "readme"])).toEqual(["a.jpg", "b.MP4"]);
  });
});

describe("media paths", () => {
  it("キーを URL に往復できる", () => {
    const key = "trip/2024 summer/写真 #1.jpg";
    expect(keyFromMediaPath(mediaPath(key))).toBe(key);
  });

  it("空や親パスは拒否する", () => {
    expect(keyFromMediaPath("/media/")).toBeNull();
    expect(keyFromMediaPath("/media/..")).toBeNull();
    expect(keyFromMediaPath("/media/foo/../../etc")).toBeNull();
    expect(keyFromMediaPath("/other/a.jpg")).toBeNull();
  });
});

describe("html and ranges", () => {
  it("メール表示用に HTML をエスケープする", () => {
    expect(escapeHtml(`a<b>&"'`)).toBe("a&lt;b&gt;&amp;&quot;&#39;");
  });

  it("Range 応答の Content-Range を組み立てる", () => {
    expect(byteContentRange({ offset: 0, length: 100 }, 1000)).toBe("bytes 0-99/1000");
    expect(byteContentRange({ suffix: 50 }, 1000)).toBe("bytes 950-999/1000");
  });
});

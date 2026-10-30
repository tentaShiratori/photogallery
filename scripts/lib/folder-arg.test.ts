import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { assertDirectory, FolderArgError, resolveFolderArg } from "./folder-arg.ts";

describe("resolveFolderArg", () => {
  it("先頭の -- を飛ばしてフォルダを絶対パスにする", () => {
    expect(resolveFolderArg(["--", "--", "photos"])).toBe(path.resolve("photos"));
  });

  it("引数がない、または空なら missing", () => {
    expect(() => resolveFolderArg([])).toThrow(FolderArgError);
    expect(() => resolveFolderArg(["--"])).toThrow(expect.objectContaining({ reason: "missing" }));
    expect(() => resolveFolderArg([""])).toThrow(
      expect.objectContaining({ reason: "missing", name: "FolderArgError" }),
    );
  });
});

describe("assertDirectory", () => {
  it("ディレクトリなら通す", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-folder-"));
    try {
      await expect(assertDirectory(dir)).resolves.toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ファイルや存在しないパスは not-folder", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photogallery-folder-"));
    const filePath = path.join(dir, "shot.png");
    try {
      await writeFile(filePath, "png");
      await expect(assertDirectory(filePath)).rejects.toMatchObject({
        reason: "not-folder",
        folderPath: filePath,
      });
      const missing = path.join(dir, "missing");
      await expect(assertDirectory(missing)).rejects.toMatchObject({ reason: "not-folder", folderPath: missing });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stat が失敗したときも not-folder", async () => {
    await expect(assertDirectory("/any", async () => Promise.reject(new Error("denied")))).rejects.toMatchObject({
      reason: "not-folder",
      folderPath: "/any",
    });
    await expect(assertDirectory("/file", async () => ({ isDirectory: () => false }))).rejects.toMatchObject({
      reason: "not-folder",
    });
  });
});

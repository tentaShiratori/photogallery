import { describe, expect, it } from "vite-plus/test";
import type { PlannedFile } from "../../src/lib/name/index.ts";
import type { ObjectBody, ObjectSink } from "./object-sink.ts";
import { putAll } from "./put-all.ts";

function planned(name: string, kind: PlannedFile["plan"]["kind"] = "image"): PlannedFile {
  const stem = name.replace(/\.[^.]+$/, "");
  const extension = name.slice(stem.length);
  return {
    name,
    filePath: `/photos/${name}`,
    plan: {
      bodyKey: `${stem}${extension}` as PlannedFile["plan"]["bodyKey"],
      thumbKey: `t/${stem}.webp` as PlannedFile["plan"]["thumbKey"],
      kind,
      bodyContentType: kind === "video" ? "video/mp4" : "image/png",
    },
  };
}

function fakeSink(): ObjectSink & {
  puts: { key: string; body: ObjectBody; contentType: string; contentLength: number }[];
} {
  const puts: { key: string; body: ObjectBody; contentType: string; contentLength: number }[] = [];
  return {
    puts,
    async put(key, body, contentType, contentLength) {
      puts.push({ key, body, contentType, contentLength });
    },
    async close() {
      return undefined;
    },
  };
}

describe("putAll", () => {
  it("サムネイルと本体を上げ、ログする", async () => {
    const sink = fakeSink();
    const logs: string[] = [];
    const stream = { path: "body" } as unknown as ReturnType<typeof import("node:fs").createReadStream>;
    await putAll([planned("a.png"), planned("b.mp4", "video")], sink, {
      stat: async () => ({ size: 8 }),
      thumbnailBytes: async () => ({ bytes: new Uint8Array([1, 2]), contentType: "image/webp" }),
      createReadStream: () => stream,
      log: (message) => logs.push(message),
    });
    const rows = sink.puts.map((put) => [put.key, put.contentType, put.contentLength]);
    expect(rows).toHaveLength(4);
    expect(rows).toEqual(
      expect.arrayContaining([
        ["t/a.webp", "image/webp", 2],
        ["a.png", "image/png", 8],
        ["t/b.webp", "image/webp", 2],
        ["b.mp4", "video/mp4", 8],
      ]),
    );
    expect(sink.puts.find((put) => put.key === "a.png")?.body).toBe(stream);
    expect(logs).toHaveLength(2);
    expect(logs).toEqual(
      expect.arrayContaining(["uploaded a.png -> a.png (8 bytes)", "uploaded b.mp4 -> b.mp4 (8 bytes)"]),
    );
  });

  it("失敗を集めて件数を返す", async () => {
    const sink = fakeSink();
    const errors: string[] = [];
    await expect(
      putAll([planned("ok.png"), planned("bad.png"), planned("text.png")], sink, {
        stat: async (filePath) => {
          if (filePath.endsWith("bad.png")) throw new Error("disk");
          return { size: 4 };
        },
        thumbnailBytes: async (filePath) => {
          if (filePath.endsWith("text.png")) throw "nope";
          return { bytes: new Uint8Array([7]), contentType: "image/webp" };
        },
        createReadStream: () => ({}) as ReturnType<typeof import("node:fs").createReadStream>,
        error: (message) => errors.push(message),
      }),
    ).rejects.toThrow("2 件失敗しました。");
    expect(errors).toEqual(["failed bad.png: disk", "failed text.png: nope"]);
    expect(sink.puts.map((put) => put.key)).toEqual(["t/ok.webp", "ok.png"]);
  });

  it("対象が空なら何もしない", async () => {
    const sink = fakeSink();
    await putAll([], sink);
    expect(sink.puts).toEqual([]);
  });
});

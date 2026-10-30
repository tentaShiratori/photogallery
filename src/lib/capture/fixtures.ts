export const noon = {
  year: 2024,
  month: 8,
  day: 2,
  hour: 12,
  minute: 0,
  second: 0,
};

export function openFiles(files: Map<string, Uint8Array>) {
  const calls: { key: string; offset: number; length: number }[] = [];
  const read = async (key: string, offset: number, length: number) => {
    calls.push({ key, offset, length });
    const file = files.get(key);
    if (!file || length <= 0 || offset >= file.length) return new Uint8Array();
    return file.slice(offset, Math.min(file.length, offset + length));
  };
  return { calls, read };
}

export function overlaps(offset: number, length: number, start: number, end: number): boolean {
  return offset < end && offset + length > start;
}

export function creationdateKeys(where: "moov" | "udta", creationdate: string) {
  return {
    in: where,
    items: [
      ["com.apple.quicktime.make", "1999-01-01T00:00:00+0000"],
      ["com.apple.quicktime.creationdate", creationdate],
    ] as const,
  };
}

export function androidKeys(where: "moov" | "udta") {
  return {
    in: where,
    items: [
      ["com.android.manufacturer", "Google"],
      ["com.android.model", "Pixel 7a"],
      ["com.android.capture.fps", "30.000"],
    ] as const,
  };
}

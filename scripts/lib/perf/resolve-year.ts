import type { BrowserContext } from "playwright-core";

type YearListJson = {
  readonly years?: readonly { readonly label?: string }[];
};

function tokenFromLabel(label: string): string {
  return label === "年不明" ? "unknown" : label;
}

export async function resolveYearToken(context: BrowserContext, baseUrl: string, year: string | null): Promise<string> {
  if (year !== null) return year;
  const response = await context.request.get(new URL("/api/media", baseUrl).href);
  if (!response.ok()) {
    throw new Error(`対象年を /api/media から取れませんでした（${response.status()}）。`);
  }
  const body = (await response.json()) as YearListJson;
  const label = body.years?.[0]?.label;
  if (label === undefined || label.length === 0) {
    throw new Error("年の一覧が空なので、対象年が決まりません。");
  }
  return tokenFromLabel(label);
}

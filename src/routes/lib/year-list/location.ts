export function yearTokenFromLabel(label: string): string {
  return label === "年不明" ? "unknown" : label;
}

export function readYearFromLocation(): string | null {
  const raw = new URLSearchParams(window.location.search).get("year");
  if (raw === null || raw.length === 0) return null;
  return raw;
}

export function writeYearToLocation(yearToken: string | null, replace = false): void {
  const url = new URL(window.location.href);
  if (yearToken === null) url.searchParams.delete("year");
  else url.searchParams.set("year", yearToken);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", url);
}

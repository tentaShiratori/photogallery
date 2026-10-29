import type { Year } from "./types.ts";

export function toYear(value: number): Year | null {
  return Number.isInteger(value) && value >= 1 && value <= 9999 ? (value as Year) : null;
}

export function parseYear(raw: string): Year | null {
  return /^[1-9]\d{0,3}$/.test(raw) ? toYear(Number(raw)) : null;
}

export type YearQuery = Year | "unknown";

/** `unknown`, or a year in 1..9999 with no leading zeros. */
export function parseYearQuery(raw: string): YearQuery | null {
  if (raw === "unknown") return "unknown";
  return parseYear(raw);
}
